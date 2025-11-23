import functools, requests

from flask import Blueprint, request, redirect, url_for, flash, render_template, session, g, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

from sprout import db
from sprout.forms import UserCreateForm, UserLoginForm, EditProfileForm
from sprout.models import User

bp = Blueprint('auth', __name__, url_prefix='/')

@bp.route('/signup/', methods=['GET', 'POST'])
def signup():
    form = UserCreateForm()
    if request.method == 'POST' and form.validate_on_submit():

        # 사용자명 중복 체크
        existing_username = User.query.filter_by(username=form.username.data).first()
        if existing_username:
            flash('이미 존재하는 사용자입니다.', 'danger')
            return render_template('auth/signup.html', form=form)

        # 이메일 중복 체크
        existing_email = User.query.filter_by(email=form.email.data).first()
        if existing_email:
            flash('이미 등록된 이메일입니다.', 'danger')
            return render_template('auth/signup.html', form=form)

        # 중복이 없으면 회원가입 진행
        try:
            user = User(
                username=form.username.data,
                password=generate_password_hash(form.password1.data),
                email=form.email.data,
                phone=form.phone.data
            )
            db.session.add(user)
            db.session.commit()
            flash('회원가입이 완료되었습니다.', 'success')
            return redirect(url_for('auth.login'))
        except Exception as e:
            db.session.rollback()
            flash('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.', 'danger')
            print(f"회원가입 오류: {e}")
            return render_template('auth/signup.html', form=form)

    return render_template('auth/signup.html', form=form)


@bp.route('/login/', methods=['GET', 'POST'])
def login():
    form = UserLoginForm()
    if request.method == 'POST' and form.validate_on_submit():
        errormsg = None
        user = User.query.filter_by(username=form.username.data).first()
        if not user:
            errormsg = '존재하지 않는 사용자입니다.'
        elif not check_password_hash(user.password, form.password.data):
            errormsg = '비밀번호가 올바르지 않습니다.'
        if errormsg is None:
            session.clear()
            session['user_id'] = user.id
            _next = request.args.get('next', '')
            if _next:
                return redirect(_next)
            else:
                return redirect(url_for('main.index'))
        else:
            flash(errormsg, 'danger')
    return render_template('auth/login.html', form=form)


# 라우팅 함수보다 먼저 실행하는 함수
@bp.before_app_request
def load_logged_in_user():
    # 정적 파일(static) 요청은 무시
    if request.path.startswith('/static/'):
        return

    user_id = session.get('user_id')
    if user_id is None:
        g.user = None
    else:
        g.user = User.query.get(user_id)
        if g.user:
            print(f"✓ 사용자 로드됨: {g.user.username} (ID: {g.user.id})")


# 로그아웃
@bp.route('/logout/')
def logout():
    session.clear()
    return redirect(url_for('main.index'))


# login_required 데코레이터 함수
# 데코레이터(decorator) - 로그인 한 사용자만 접근
def login_required(view):
    @functools.wraps(view)
    def wrapped_view(*args, **kwargs):
        if g.user is None:
            _next = request.url if request.method == 'GET' else ''
            return redirect(url_for('auth.login', next=_next))
        return view(*args, **kwargs)

    return wrapped_view

# 마이페이지
@bp.route('/mypage/')
@login_required
def mypage():
    return render_template('mypage.html')


# 회원정보 수정 페이지 + 수정 처리
@bp.route('/edit_profile/', methods=['GET', 'POST'])
@login_required
def edit_profile():
    form = EditProfileForm(obj=g.user)  # 기존 정보 자동 채우기

    if request.method == 'POST' and form.validate_on_submit():

        # 사용자명 중복 체크 (본인 제외)
        existing_user = User.query.filter(
            User.username == form.username.data,
            User.id != g.user.id
        ).first()
        if existing_user:
            flash('이미 존재하는 사용자 이름입니다.', 'danger')
            return render_template('auth/edit_profile.html', form=form)

        # 이메일 중복 체크 (본인 제외)
        if form.email.data:
            existing_email = User.query.filter(
                User.email == form.email.data,
                User.id != g.user.id
            ).first()
            if existing_email:
                flash('이미 등록된 이메일입니다.', 'danger')
                return render_template('auth/edit_profile.html', form=form)

        # 정보 업데이트
        g.user.username = form.username.data
        g.user.email = form.email.data
        g.user.phone = form.phone.data

        # 프로필 이미지 처리
        profile_file = request.files.get('profile_image_file')
        delete_image = request.form.get('delete_image') == 'true'

        if delete_image:
            # 이미지 삭제
            g.user.profile_image = None
        elif profile_file and profile_file.filename:
            # 새 이미지 업로드
            import base64
            image_data = profile_file.read()
            g.user.profile_image = f"data:image/jpeg;base64,{base64.b64encode(image_data).decode('utf-8')}"

        # 비밀번호 변경 시
        if form.password.data:
            g.user.password = generate_password_hash(form.password.data)

        db.session.commit()
        flash('회원정보가 수정되었습니다.', 'success')
        return redirect(url_for('auth.edit_profile'))

    return render_template('auth/edit_profile.html', form=form)

# ---------------------------------------------------
# 포트원(아임포트) 전화번호 본인인증 API 연동
# ---------------------------------------------------

# 포트원 Access Token 발급 함수
def get_portone_access_token():
    url = "https://api.iamport.kr/users/getToken"
    data = {
        'imp_key': "YOUR_API_KEY",        # ★ 본인 포트원 API KEY
        'imp_secret': "YOUR_API_SECRET"   # ★ 본인 포트원 SECRET
    }
    response = requests.post(url, data=data).json()
    return response['response']['access_token']


# 본인인증 검증 라우트
@bp.route('/verify_phone_cert/', methods=['POST'])
@login_required
def verify_phone_cert():
    imp_uid = request.json.get("imp_uid")

    # Access Token 발급
    access_token = get_portone_access_token()

    # imp_uid로 본인인증 결과 조회
    url = f"https://api.iamport.kr/certifications/{imp_uid}"
    headers = {"Authorization": access_token}
    result = requests.get(url, headers=headers).json()

    if result['code'] != 0:
        return jsonify({"verified": False}), 400

    cert_info = result['response']

    # 검증 성공 -> 세션에 인증된 전화번호 저장
    session['verified_phone'] = cert_info['phone']

    return jsonify({
        "verified": True,
        "phone": cert_info['phone']
    })

# 회원정보 수정 시, 본인인증된 전화번호만 저장하도록 하는 기능
@bp.before_app_request
def check_phone_verification():
    # edit_profile.html의 POST 요청 검사
    if request.endpoint == 'auth.edit_profile' and request.method == 'POST':
        new_phone = request.form.get("phone")

        # 전화번호 변경 후 본인인증
        if g.user and new_phone and new_phone != g.user.phone:
            verified_phone = session.get('verified_phone')

            if verified_phone != new_phone:
                flash("변경된 전화번호는 본인인증이 필요합니다.", "danger")
                return redirect(url_for('auth.edit_profile'))