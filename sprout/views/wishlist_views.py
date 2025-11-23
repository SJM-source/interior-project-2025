from flask import Blueprint, request, render_template, g, jsonify
from sprout.models import Cart, CartItem, ViewedProduct, db
from sprout.views.auth_views import login_required

bp = Blueprint('wishlist', __name__, url_prefix='/')


# 위시리스트 메인 페이지
@bp.route('/wishlist/')
@login_required
def wishlist():
    from math import ceil

    # --- 페이지네이션 설정 ---
    page = request.args.get('page', 1, type=int)
    per_page = 5  # 5개 초과 시 페이지네이션

    # --- 사용자 장바구니 조회 ---
    cart = Cart.query.filter_by(user_id=g.user.id).first()

    total_items = 0
    cart_items = []
    total_pages = 1
    selected_total_price = 0

    if cart:
        base_query = (
            CartItem.query
            .filter_by(cart_id=cart.id)
            .order_by(CartItem.created_date.desc())
        )

        total_items = base_query.count()

        if total_items > 0:
            total_pages = ceil(total_items / per_page) if total_items > per_page else 1

            cart_items = (
                base_query
                .offset((page - 1) * per_page)
                .limit(per_page)
                .all()
            )

            # 초기 로딩 시: 페이지에 보이는 아이템을 전부 선택 상태로 가정
            selected_total_price = sum(
                (item.price or 0) * (item.quantity or 1)
                for item in cart_items
            )

    # --- 최근 본 상품 조회 ---
    viewed_products = (
        ViewedProduct.query
        .filter_by(user_id=g.user.id)
        .order_by(ViewedProduct.viewed_date.desc())
        .limit(10)
        .all()
    )

    return render_template(
        'wishlist.html',
        cart_items=cart_items,
        total_items=total_items,
        total_pages=total_pages,
        current_page=page,
        per_page=per_page,
        selected_total_price=selected_total_price,
        viewed_products=viewed_products,
    )


# 위시리스트 추가 기능
@bp.route('/wishlist/add', methods=['POST'])
@login_required
def add_to_wishlist():
    data = request.get_json()
    product_id = data.get("product_id")

    from math import ceil

    # --- 페이지네이션 설정 ---
    page = request.args.get('page', 1, type=int)
    per_page = 5  # 5개 초과 시 페이지네이션

    # --- 사용자 장바구니 조회 ---
    cart = Cart.query.filter_by(user_id=g.user.id).first()

    total_items = 0
    cart_items = []
    total_pages = 1
    selected_total_price = 0

    if cart:
        base_query = (
            CartItem.query
            .filter_by(cart_id=cart.id)
            .order_by(CartItem.created_date.desc())
        )

        total_items = base_query.count()

        if total_items > 0:
            total_pages = ceil(total_items / per_page) if total_items > per_page else 1

            cart_items = (
                base_query
                .offset((page - 1) * per_page)
                .limit(per_page)
                .all()
            )

            # 초기 로딩 시: 페이지에 보이는 아이템을 전부 선택 상태로 가정
            selected_total_price = sum(
                (item.price or 0) * (item.quantity or 1)
                for item in cart_items
            )

    # --- 최근 본 상품 조회 ---
    viewed_products = (
        ViewedProduct.query
        .filter_by(user_id=g.user.id)
        .order_by(ViewedProduct.viewed_date.desc())
        .limit(10)
        .all()
    )

    return render_template(
        'wishlist.html',
        cart_items=cart_items,
        total_items=total_items,
        total_pages=total_pages,
        current_page=page,
        per_page=per_page,
        selected_total_price=selected_total_price,
        viewed_products=viewed_products,
    )


# 최근 본 상품 추가 API
@bp.route('/product/viewed', methods=['POST'])
@login_required
def add_viewed_product():
    data = request.get_json()
    product_id = data.get('product_id')

    if not product_id:
        return jsonify({'success': False, 'message': '상품 ID가 필요합니다.'}), 400

    # 현재 사용자의 최근 본 상품 개수 확인
    user_viewed_count = ViewedProduct.query.filter_by(user_id=g.user.id).count()

    # 최근 본 상품 10개 초과시 오래된 항목 자동 삭제
    if user_viewed_count >= 10:
        # 가장 오래된 항목 찾아서 삭제
        oldest_viewed = ViewedProduct.query.filter_by(user_id=g.user.id).order_by(
            ViewedProduct.viewed_date.asc()).first()
        if oldest_viewed:
            db.session.delete(oldest_viewed)

    # 새로운 최근 본 상품 추가
    new_viewed = ViewedProduct(
        user_id=g.user.id,
        product_id=product_id,
        name=data.get('name'),
        brand=data.get('brand'),
        price=data.get('price'),
        image_url=data.get('image_url')
    )
    db.session.add(new_viewed)
    db.session.commit()

    return jsonify({'success': True, 'message': '최근 본 상품에 추가되었습니다.'})