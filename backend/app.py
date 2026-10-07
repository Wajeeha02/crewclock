import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from models import db, UserProfile, Job, TimeEntry, PTORequest, ContractorUnitLog, EquipmentUnit

app = Flask(__name__)
# Ensure the database is created in the backend directory
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'crewclock.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app)
db.init_app(app)

# --- USERS ---
@app.route('/api/users', methods=['GET'])
def get_users():
    users = UserProfile.query.all()
    return jsonify([u.to_dict() for u in users])

# --- JOBS ---
@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    jobs = Job.query.all()
    return jsonify([j.to_dict() for j in jobs])

@app.route('/api/jobs', methods=['POST'])
def create_job():
    data = request.json or {}
    # type: ignore
    job = Job(
        id=data.get('id'),
        name=data.get('name'),
        code=data.get('code'),
        address=data.get('address'),
        lat=data.get('lat'),
        lng=data.get('lng'),
        radius=data.get('radius'),
        color=data.get('color'),
        assignedCrewIds=data.get('assignedCrewIds', []),
        segments=data.get('segments', []),
        dispatchNotes=data.get('dispatchNotes'),
        attachments=data.get('attachments', []),
        status=data.get('status', 'active')
    )
    db.session.add(job)
    db.session.commit()
    return jsonify(job.to_dict()), 201

@app.route('/api/jobs/<job_id>', methods=['PUT'])
def update_job(job_id):
    job = Job.query.get_or_404(job_id)
    data = request.json or {}
    for key, value in data.items():
        setattr(job, key, value)
    db.session.commit()
    return jsonify(job.to_dict())

@app.route('/api/jobs/<job_id>', methods=['DELETE'])
def delete_job(job_id):
    job = Job.query.get_or_404(job_id)
    db.session.delete(job)
    db.session.commit()
    return jsonify({'success': True})

# --- TIME ENTRIES ---
@app.route('/api/time_entries', methods=['GET'])
def get_time_entries():
    entries = TimeEntry.query.order_by(TimeEntry.start.desc()).all()
    return jsonify([e.to_dict() for e in entries])

@app.route('/api/time_entries', methods=['POST'])
def create_time_entry():
    data = request.json or {}
    # type: ignore
    entry = TimeEntry(
        id=data.get('id'),
        userId=data.get('userId'),
        userName=data.get('userName'),
        jobId=data.get('jobId'),
        segment=data.get('segment'),
        workType=data.get('workType'),
        start=data.get('start'),
        end=data.get('end'),
        notes=data.get('notes', ''),
        lat=data.get('lat'),
        lng=data.get('lng'),
        locationFlag=data.get('locationFlag'),
        supervisorStatus=data.get('supervisorStatus', 'approved'),
        approvedBy=data.get('approvedBy'),
        approvedAt=data.get('approvedAt'),
        editHistory=data.get('editHistory', []),
        gpsRoute=data.get('gpsRoute')
    )
    db.session.add(entry)
    db.session.commit()
    return jsonify(entry.to_dict()), 201

@app.route('/api/time_entries/<entry_id>', methods=['PUT'])
def update_time_entry(entry_id):
    entry = TimeEntry.query.get_or_404(entry_id)
    data = request.json or {}
    for key, value in data.items():
        setattr(entry, key, value)
    db.session.commit()
    return jsonify(entry.to_dict())

@app.route('/api/time_entries/<entry_id>', methods=['DELETE'])
def delete_time_entry(entry_id):
    entry = TimeEntry.query.get_or_404(entry_id)
    db.session.delete(entry)
    db.session.commit()
    return jsonify({'success': True})

# --- PTO REQUESTS ---
@app.route('/api/pto_requests', methods=['GET'])
def get_pto_requests():
    reqs = PTORequest.query.all()
    return jsonify([r.to_dict() for r in reqs])

@app.route('/api/pto_requests', methods=['POST'])
def create_pto_request():
    data = request.json or {}
    # type: ignore
    req = PTORequest(
        id=data.get('id'),
        userId=data.get('userId'),
        userName=data.get('userName'),
        startDate=data.get('startDate'),
        endDate=data.get('endDate'),
        totalHours=data.get('totalHours'),
        reason=data.get('reason'),
        status=data.get('status', 'pending'),
        supervisorNotes=data.get('supervisorNotes'),
        reviewedBy=data.get('reviewedBy'),
        reviewedAt=data.get('reviewedAt')
    )
    db.session.add(req)
    db.session.commit()
    return jsonify(req.to_dict()), 201

@app.route('/api/pto_requests/<pto_id>', methods=['PUT'])
def update_pto_request(pto_id):
    req = PTORequest.query.get_or_404(pto_id)
    data = request.json or {}
    for key, value in data.items():
        setattr(req, key, value)
    db.session.commit()
    return jsonify(req.to_dict())

# --- CONTRACTOR LOGS ---
@app.route('/api/contractor_logs', methods=['GET'])
def get_contractor_logs():
    logs = ContractorUnitLog.query.order_by(ContractorUnitLog.start.desc()).all()
    return jsonify([l.to_dict() for l in logs])

@app.route('/api/contractor_logs', methods=['POST'])
def create_contractor_log():
    data = request.json or {}
    # type: ignore
    log = ContractorUnitLog(
        id=data.get('id'),
        contractorId=data.get('contractorId'),
        contractorName=data.get('contractorName'),
        companyName=data.get('companyName'),
        equipmentUnit=data.get('equipmentUnit'),
        equipmentId=data.get('equipmentId'),
        start=data.get('start'),
        end=data.get('end'),
        workDescription=data.get('workDescription'),
        validatedBySupervisor=data.get('validatedBySupervisor', False),
        validationNotes=data.get('validationNotes')
    )
    db.session.add(log)
    db.session.commit()
    return jsonify(log.to_dict()), 201

@app.route('/api/contractor_logs/<log_id>', methods=['PUT'])
def update_contractor_log(log_id):
    log = ContractorUnitLog.query.get_or_404(log_id)
    data = request.json or {}
    for key, value in data.items():
        setattr(log, key, value)
    db.session.commit()
    return jsonify(log.to_dict())

# --- EQUIPMENT ---
@app.route('/api/equipment', methods=['GET'])
def get_equipment():
    equipment = EquipmentUnit.query.all()
    return jsonify([e.to_dict() for e in equipment])

if __name__ == '__main__':
    app.run(debug=True, port=5000)
