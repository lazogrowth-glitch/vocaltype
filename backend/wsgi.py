from app import app, require_secret_configured

require_secret_configured()

application = app
