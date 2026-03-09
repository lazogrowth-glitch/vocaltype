#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sqlite3
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
import stripe
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_PRICE_ID = os.environ.get("STRIPE_PRICE_ID", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "")
ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "")
APP_RETURN_URL = os.environ.get(
    "APP_RETURN_URL",
    os.environ.get("FRONTEND_URL", "https://vocaltypeai.com"),
)
DATABASE_PATH = os.environ.get("DATABASE_PATH", "vocaltype.db")

stripe.api_key = STRIPE_SECRET_KEY
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def to_iso(value: int | None) -> str | None:
    if not value:
        return None
    return datetime.fromtimestamp(value, timezone.utc).isoformat()


def get_db():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    db = get_db()
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            password_hash TEXT NOT NULL,
            stripe_customer_id TEXT,
            subscription_status TEXT DEFAULT 'inactive',
            trial_end TEXT,
            period_end TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    db.commit()
    db.close()


init_db()


def make_token(user_id: int) -> str:
    payload = {
        "user_id": user_id,
        "exp": utc_now() + timedelta(days=30),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def load_user_by_id(user_id: int):
    db = get_db()
    try:
        return db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    finally:
        db.close()


def load_user_by_email(email: str):
    db = get_db()
    try:
        return db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    finally:
        db.close()


def get_current_user():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None

    try:
        payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=["HS256"])
    except Exception:
        return None

    return load_user_by_id(payload["user_id"])


def parse_iso(value: str | None):
    if not value:
        return None

    try:
        normalized = value.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None


def has_access(user) -> bool:
    status = user["subscription_status"]
    if status == "active":
        return True

    if status == "trialing":
        trial_end = parse_iso(user["trial_end"])
        if not trial_end:
            return False
        return utc_now() < trial_end

    return False


def build_user_response(user, token: str):
    return {
        "token": token,
        "user": {
            "id": str(user["id"]),
            "email": user["email"],
            "name": user["name"] or user["email"].split("@")[0],
        },
        "subscription": {
            "status": user["subscription_status"],
            "trial_ends_at": user["trial_end"],
            "current_period_ends_at": user["period_end"],
            "has_access": has_access(user),
        },
    }


def auth_required(handler):
    @wraps(handler)
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Non autorise"}), 401
        return handler(user, *args, **kwargs)

    return wrapper


def require_secret_configured():
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET is required")


def require_billing_configured():
    if not STRIPE_SECRET_KEY:
        raise RuntimeError("STRIPE_SECRET_KEY is required")
    if not STRIPE_PRICE_ID:
        raise RuntimeError("STRIPE_PRICE_ID is required")
    if not STRIPE_WEBHOOK_SECRET:
        raise RuntimeError("STRIPE_WEBHOOK_SECRET is required")


def ensure_customer(user):
    if user["stripe_customer_id"]:
        return user["stripe_customer_id"]

    customer = stripe.Customer.create(email=user["email"], name=user["name"] or "")
    db = get_db()
    try:
        db.execute(
            "UPDATE users SET stripe_customer_id = ? WHERE id = ?",
            (customer.id, user["id"]),
        )
        db.commit()
    finally:
        db.close()

    return customer.id


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "vocaltype-backend"})


@app.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    name = data.get("name", "").strip() or None

    if not email or "@" not in email:
        return jsonify({"error": "Email invalide"}), 400

    if len(password) < 6:
        return jsonify({"error": "Mot de passe trop court (min 6 caracteres)"}), 400

    if load_user_by_email(email):
        return jsonify({"error": "Cet email est deja utilise"}), 409

    try:
        trial_end = (utc_now() + timedelta(days=7)).isoformat()
        db = get_db()
        try:
            db.execute(
                """
                INSERT INTO users (
                    email,
                    name,
                    password_hash,
                    subscription_status,
                    trial_end
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (
                    email,
                    name,
                    generate_password_hash(password),
                    "trialing",
                    trial_end,
                ),
            )
            db.commit()
            user = db.execute(
                "SELECT * FROM users WHERE email = ?",
                (email,),
            ).fetchone()
        finally:
            db.close()

        token = make_token(user["id"])
        return jsonify(build_user_response(user, token)), 201
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = load_user_by_email(email)
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Email ou mot de passe incorrect"}), 401

    token = make_token(user["id"])
    return jsonify(build_user_response(user, token))


@app.route("/auth/session", methods=["GET"])
@auth_required
def session(user):
    token = make_token(user["id"])
    return jsonify(build_user_response(user, token))


@app.route("/billing/checkout", methods=["POST"])
@auth_required
def billing_checkout(user):
    try:
        require_billing_configured()
        if has_access(user):
            return jsonify({"error": "Acces deja actif"}), 400

        customer_id = ensure_customer(user)
        checkout = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
            mode="subscription",
            success_url=f"{APP_RETURN_URL}?checkout=success",
            cancel_url=f"{APP_RETURN_URL}?checkout=cancelled",
        )
        return jsonify({"url": checkout.url})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/billing/portal", methods=["POST"])
@auth_required
def billing_portal(user):
    if not user["stripe_customer_id"]:
        return jsonify({"error": "Aucun client Stripe trouve"}), 400

    try:
        require_billing_configured()
        portal = stripe.billing_portal.Session.create(
            customer=user["stripe_customer_id"],
            return_url=APP_RETURN_URL,
        )
        return jsonify({"url": portal.url})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/webhook", methods=["POST"])
def webhook():
    require_billing_configured()
    payload = request.data
    signature = request.headers.get("Stripe-Signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload,
            signature,
            STRIPE_WEBHOOK_SECRET,
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400

    def update_subscription(
        customer_id: str,
        status: str,
        trial_end: int | None = None,
        period_end: int | None = None,
    ):
        db = get_db()
        try:
            db.execute(
                """
                UPDATE users
                SET subscription_status = ?, trial_end = ?, period_end = ?
                WHERE stripe_customer_id = ?
                """,
                (status, to_iso(trial_end), to_iso(period_end), customer_id),
            )
            db.commit()
        finally:
            db.close()

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type in (
        "customer.subscription.created",
        "customer.subscription.updated",
    ):
        update_subscription(
            data["customer"],
            data["status"],
            data.get("trial_end"),
            data.get("current_period_end"),
        )
    elif event_type == "customer.subscription.deleted":
        update_subscription(
            data["customer"],
            "canceled",
            data.get("trial_end"),
            data.get("current_period_end"),
        )

    return jsonify({"ok": True})


@app.route("/admin/activate", methods=["POST"])
def admin_activate():
    secret = request.headers.get("X-Admin-Secret", "")
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()

    if not ADMIN_SECRET or secret != ADMIN_SECRET:
        return jsonify({"error": "Non autorise"}), 401

    if not email:
        return jsonify({"error": "Email requis"}), 400

    db = get_db()
    try:
        user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if not user:
            return jsonify({"error": "Utilisateur introuvable"}), 404

        far_future = datetime(2099, 12, 31, tzinfo=timezone.utc).isoformat()
        db.execute(
            """
            UPDATE users
            SET subscription_status = ?, period_end = ?
            WHERE email = ?
            """,
            ("active", far_future, email),
        )
        db.commit()
    finally:
        db.close()

    return jsonify({"ok": True, "email": email, "status": "active"})


if __name__ == "__main__":
    require_secret_configured()
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
