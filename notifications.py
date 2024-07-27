from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from apscheduler.schedulers.background import BackgroundScheduler

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
db = SQLAlchemy(app)

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.String(100), nullable=False)
    seen = db.Column(db.Boolean, default=False)

def check_for_new_fines():
    # Lógica para verificar nuevas multas y agregar notificaciones
    pass

scheduler = BackgroundScheduler()
scheduler.add_job(func=check_for_new_fines, trigger="interval", minutes=10)
scheduler.start()

@app.route('/notifications', methods=['GET'])
def get_notifications():
    notifications = Notification.query.filter_by(seen=False).all()
    return jsonify([{'id': n.id, 'message': n.message} for n in notifications])

if __name__ == "__main__":
    app.run(debug=True)

@app.route('/add_test_notification', methods=['POST'])
def add_test_notification():
    message = request.json.get('message', 'Prueba de notificación')
    new_notification = Notification(message=message, seen=False)
    db.session.add(new_notification)
    db.session.commit()
    return jsonify({'status': 'Notificación añadida'}), 201
