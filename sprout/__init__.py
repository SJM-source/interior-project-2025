import os
import logging

from flask import Flask, g, session, current_app
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event
from sqlalchemy.engine import Engine

import config

db = SQLAlchemy()
migrate = Migrate()


class NoStaticFilter(logging.Filter):
    """
    /static/ 으로 들어오는 요청 로그만 숨기는 필터
    """
    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        # /static/ 이 포함된 로그는 False 반환 → 출력 안 됨
        return "/static/" not in msg


def configure_werkzeug_logging():
    """
    GAGU_MODE에 따라 werkzeug 로그 제어
      - dev     : 기본 (로그 전체 보임)
      - present : /static/ 요청 로그만 숨기고 나머지는 표시
    """
    mode = os.getenv("GAGU_MODE", "dev")

    logger = logging.getLogger("werkzeug")

    if mode == "present":
        # 기본 INFO 레벨 유지 (Running on ... 은 보이게)
        logger.setLevel(logging.INFO)

        # /static/ 로그만 숨기는 필터 추가
        # (중복 추가 방지용으로 타입 체크)
        if not any(isinstance(f, NoStaticFilter) for f in logger.filters):
            logger.addFilter(NoStaticFilter())
    else:
        # dev 모드: 필터 제거해서 전체 로그 보이게
        logger.setLevel(logging.INFO)
        logger.filters.clear()


# SQLite 최적화 설정 (database is locked 해결)
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=DELETE") #보조 db 만들기 ( WAL )
    cursor.execute("PRAGMA busy_timeout=30000")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()


def create_app():
    app = Flask(__name__)
    app.config.from_object(config)
    app.config['SECRET_KEY'] = '4565656246565'

    # 세션 쿠키 설정 추가 (보안 강화)
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['PERMANENT_SESSION_LIFETIME'] = 3600  # 1시간

    # 🔧 werkzeug 로그 설정
    configure_werkzeug_logging()

    # SQLite 설정 (database is locked 해결)
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'connect_args': {
            'timeout': 30,
            'check_same_thread': False
        },
        'pool_pre_ping': True,
        'pool_recycle': 3600
    }

    # ORM 설정
    db.init_app(app)
    migrate.init_app(app, db)
    from . import models

    # 블루프린트 등록
    from .views import main_views, auth_views, product_views, user_views, wishlist_views
    app.register_blueprint(main_views.bp)
    app.register_blueprint(auth_views.bp)
    app.register_blueprint(product_views.bp)
    app.register_blueprint(user_views.bp)
    app.register_blueprint(wishlist_views.bp)
    # DB에서 로그인 사용자 정보 불러오기
    @app.before_request
    def load_logged_in_user():
        user_id = session.get('user_id')
        if user_id is None:
            g.user = None
        else:
            from .models import User
            g.user = User.query.get(user_id)

            if g.user:
                # 디버그 모드에서만 사용자 로드 메시지 출력
                if app.debug:
                    print(f"✓ 사용자 로드됨: {g.user.username} (ID: {g.user.id})")
            else:
                if app.debug:
                    print(f"⚠ User ID {user_id}를 찾을 수 없음")

    return app