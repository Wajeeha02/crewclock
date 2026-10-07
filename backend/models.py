from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.sqlite import JSON

db = SQLAlchemy()

class UserProfile(db.Model):
    __tablename__ = 'user_profiles'
    id = db.Column(db.String, primary_key=True)
    name = db.Column(db.String, nullable=False)
    role = db.Column(db.String, nullable=False)
    email = db.Column(db.String)
    avatar = db.Column(db.String)
    title = db.Column(db.String)
    hourlyRate = db.Column(db.Float)
    startDate = db.Column(db.String)
    ptoAccruedBase = db.Column(db.Float)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'role': self.role,
            'email': self.email,
            'avatar': self.avatar,
            'title': self.title,
            'hourlyRate': self.hourlyRate,
            'startDate': self.startDate,
            'ptoAccruedBase': self.ptoAccruedBase
        }

class Job(db.Model):
    __tablename__ = 'jobs'
    id = db.Column(db.String, primary_key=True)
    name = db.Column(db.String)
    code = db.Column(db.String)
    address = db.Column(db.String)
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    radius = db.Column(db.Integer)
    color = db.Column(db.String)
    assignedCrewIds = db.Column(JSON)
    segments = db.Column(JSON)
    dispatchNotes = db.Column(db.String, nullable=True)
    attachments = db.Column(JSON, nullable=True)
    status = db.Column(db.String)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'address': self.address,
            'lat': self.lat,
            'lng': self.lng,
            'radius': self.radius,
            'color': self.color,
            'assignedCrewIds': self.assignedCrewIds or [],
            'segments': self.segments or [],
            'dispatchNotes': self.dispatchNotes,
            'attachments': self.attachments or [],
            'status': self.status
        }

class TimeEntry(db.Model):
    __tablename__ = 'time_entries'
    id = db.Column(db.String, primary_key=True)
    userId = db.Column(db.String)
    userName = db.Column(db.String)
    jobId = db.Column(db.String)
    segment = db.Column(db.String)
    workType = db.Column(db.String)
    start = db.Column(db.String)
    end = db.Column(db.String, nullable=True)
    notes = db.Column(db.String)
    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)
    locationFlag = db.Column(db.String, nullable=True)
    supervisorStatus = db.Column(db.String)
    approvedBy = db.Column(db.String, nullable=True)
    approvedAt = db.Column(db.String, nullable=True)
    editHistory = db.Column(JSON, nullable=True)
    gpsRoute = db.Column(JSON, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.userId,
            'userName': self.userName,
            'jobId': self.jobId,
            'segment': self.segment,
            'workType': self.workType,
            'start': self.start,
            'end': self.end,
            'notes': self.notes,
            'lat': self.lat,
            'lng': self.lng,
            'locationFlag': self.locationFlag,
            'supervisorStatus': self.supervisorStatus,
            'approvedBy': self.approvedBy,
            'approvedAt': self.approvedAt,
            'editHistory': self.editHistory or [],
            'gpsRoute': self.gpsRoute
        }

class PTORequest(db.Model):
    __tablename__ = 'pto_requests'
    id = db.Column(db.String, primary_key=True)
    userId = db.Column(db.String)
    userName = db.Column(db.String)
    startDate = db.Column(db.String)
    endDate = db.Column(db.String)
    totalHours = db.Column(db.Float)
    reason = db.Column(db.String)
    status = db.Column(db.String)
    supervisorNotes = db.Column(db.String, nullable=True)
    reviewedBy = db.Column(db.String, nullable=True)
    reviewedAt = db.Column(db.String, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.userId,
            'userName': self.userName,
            'startDate': self.startDate,
            'endDate': self.endDate,
            'totalHours': self.totalHours,
            'reason': self.reason,
            'status': self.status,
            'supervisorNotes': self.supervisorNotes,
            'reviewedBy': self.reviewedBy,
            'reviewedAt': self.reviewedAt
        }

class ContractorUnitLog(db.Model):
    __tablename__ = 'contractor_unit_logs'
    id = db.Column(db.String, primary_key=True)
    contractorId = db.Column(db.String)
    contractorName = db.Column(db.String)
    companyName = db.Column(db.String)
    equipmentUnit = db.Column(db.String)
    equipmentId = db.Column(db.String)
    start = db.Column(db.String)
    end = db.Column(db.String, nullable=True)
    workDescription = db.Column(db.String)
    validatedBySupervisor = db.Column(db.Boolean)
    validationNotes = db.Column(db.String, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'contractorId': self.contractorId,
            'contractorName': self.contractorName,
            'companyName': self.companyName,
            'equipmentUnit': self.equipmentUnit,
            'equipmentId': self.equipmentId,
            'start': self.start,
            'end': self.end,
            'workDescription': self.workDescription,
            'validatedBySupervisor': self.validatedBySupervisor,
            'validationNotes': self.validationNotes
        }

class EquipmentUnit(db.Model):
    __tablename__ = 'equipment_units'
    id = db.Column(db.String, primary_key=True)
    name = db.Column(db.String)
    type = db.Column(db.String)
    unitNumber = db.Column(db.String)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'unitNumber': self.unitNumber
        }
