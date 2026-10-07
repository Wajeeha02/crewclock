import os
from datetime import datetime, timedelta
from app import app, db
from models import UserProfile, Job, TimeEntry, PTORequest, ContractorUnitLog, EquipmentUnit

# Mock data functions
now = datetime.now()
def hours_ago(h):
    return (now - timedelta(hours=h)).isoformat() + 'Z'
def days_ago(d, h=8):
    dt = now - timedelta(days=d)
    dt = dt.replace(hour=int(h), minute=int((h % 1) * 60), second=0, microsecond=0)
    return dt.isoformat() + 'Z'

INITIAL_USERS = [
    {
        'id': 'u1', 'name': 'Jeramiah Smith', 'role': 'super_admin', 'email': 'jeramiah@ses-corp.com',
        'avatar': 'JS', 'title': 'Operations Director', 'hourlyRate': 65.0, 'startDate': '2023-01-15', 'ptoAccruedBase': 48.0
    },
    {
        'id': 'u2', 'name': 'Marcelo Alvarez', 'role': 'supervisor', 'email': 'marcelo@ses-corp.com',
        'avatar': 'MA', 'title': 'Field Supervisor', 'hourlyRate': 45.0, 'startDate': '2023-06-01', 'ptoAccruedBase': 36.0
    },
    {
        'id': 'u3', 'name': 'Mirza Baig', 'role': 'office_manager', 'email': 'mirza@ses-corp.com',
        'avatar': 'MB', 'title': 'Payroll & HR Manager', 'hourlyRate': 50.0, 'startDate': '2023-03-10', 'ptoAccruedBase': 40.0
    },
    {
        'id': 'u4', 'name': 'Marcus Vance', 'role': 'employee', 'email': 'marcus.v@ses-corp.com',
        'avatar': 'MV', 'title': 'Field Technician', 'hourlyRate': 32.0, 'startDate': '2024-01-10', 'ptoAccruedBase': 28.0
    },
    {
        'id': 'u5', 'name': 'Carlos Rivera', 'role': 'employee', 'email': 'carlos.r@ses-corp.com',
        'avatar': 'CR', 'title': 'Equipment Operator', 'hourlyRate': 34.0, 'startDate': '2024-03-01', 'ptoAccruedBase': 24.0
    },
    {
        'id': 'u6', 'name': 'Alex "Sparks" Miller', 'role': 'contractor', 'email': 'alex.welding@vendor.com',
        'avatar': 'AM', 'title': 'Specialist Yard Welder', 'hourlyRate': 75.0, 'startDate': '2024-05-15', 'ptoAccruedBase': 0.0
    },
]

INITIAL_EQUIPMENT = [
    {'id': 'eq1', 'name': 'Lincoln Electric Yard Welder #04', 'type': 'Welder', 'unitNumber': 'W-04'},
    {'id': 'eq2', 'name': 'CAT 320 Heavy Hydraulic Excavator #12', 'type': 'Excavator', 'unitNumber': 'E-12'},
    {'id': 'eq3', 'name': 'Miller Trailer Mobile Generator #02', 'type': 'Generator', 'unitNumber': 'G-02'},
    {'id': 'eq4', 'name': 'Bobcat T76 Compact Track Loader #08', 'type': 'Loader', 'unitNumber': 'L-08'},
]

INITIAL_JOBS = [
    {
        'id': 'j1', 'name': 'SCS Main Headquarters & Yard', 'code': 'JOB-101', 'address': '100 Enterprise Way, Suite 400',
        'lat': 37.7749, 'lng': -122.4194, 'radius': 300, 'color': '#3B82F6', 'assignedCrewIds': ['u4', 'u5'],
        'segments': [
            {'id': 'seg1', 'name': '01 - Yard Prep & Loading', 'code': 'YARD-01'},
            {'id': 'seg2', 'name': '02 - Fabrication & Assembly', 'code': 'FAB-02'},
            {'id': 'seg3', 'name': '03 - Maintenance & Inspection', 'code': 'MAINT-03'},
        ],
        'dispatchNotes': 'Check in with Yard Supervisor upon arrival. Hard hat and steel-toes required.',
        'status': 'active',
    },
    {
        'id': 'j2', 'name': 'Metro Plaza Substation Remodel', 'code': 'JOB-204', 'address': '450 Mission Street, San Francisco, CA',
        'lat': 37.7901, 'lng': -122.3995, 'radius': 250, 'color': '#10B981', 'assignedCrewIds': ['u4'],
        'segments': [
            {'id': 'seg4', 'name': '10 - Conduit & Wire Pulling', 'code': 'ELEC-10'},
            {'id': 'seg5', 'name': '12 - Transformer Installation', 'code': 'ELEC-12'},
        ],
        'dispatchNotes': 'Security gate code #4921. Contact Site Foreman Dave on radio Ch 4.',
        'status': 'active',
    }
]

INITIAL_ENTRIES = [
    {
        'id': 'entry-1', 'userId': 'u4', 'userName': 'Marcus Vance', 'jobId': 'j1', 'segment': '01 - Yard Prep & Loading',
        'workType': 'onsite', 'start': days_ago(1, 7), 'end': days_ago(1, 15.5), 'notes': 'Loaded trailer with 200ft conduit',
        'lat': 37.7749, 'lng': -122.4194, 'locationFlag': None, 'supervisorStatus': 'approved', 'approvedBy': 'u2', 'approvedAt': days_ago(1, 17),
        'editHistory': []
    }
]

INITIAL_PTO_REQUESTS = [
    {
        'id': 'pto-1', 'userId': 'u4', 'userName': 'Marcus Vance', 'startDate': '2026-10-15', 'endDate': '2026-10-16',
        'totalHours': 16.0, 'reason': 'Personal family obligations', 'status': 'approved', 'supervisorNotes': 'Approved by Marcelo.',
        'reviewedBy': 'u2', 'reviewedAt': days_ago(3, 10)
    }
]

INITIAL_CONTRACTOR_LOGS = [
    {
        'id': 'clog-1', 'contractorId': 'u6', 'contractorName': 'Alex "Sparks" Miller', 'companyName': 'Apex Precision Welding LLC',
        'equipmentUnit': 'Lincoln Electric Yard Welder #04', 'equipmentId': 'eq1', 'start': days_ago(1, 8), 'end': days_ago(1, 12),
        'workDescription': 'Fabricated heavy steel mounting brackets', 'validatedBySupervisor': True, 'validationNotes': 'Passed QA.'
    }
]

def seed_db():
    with app.app_context():
        db.drop_all()
        db.create_all()

        for u in INITIAL_USERS:
            db.session.add(UserProfile(**u))
        for eq in INITIAL_EQUIPMENT:
            db.session.add(EquipmentUnit(**eq))
        for j in INITIAL_JOBS:
            db.session.add(Job(**j))
        for e in INITIAL_ENTRIES:
            # pyrefly: ignore [unexpected-keyword]
            db.session.add(TimeEntry(**e))
        for p in INITIAL_PTO_REQUESTS:
            # pyrefly: ignore [unexpected-keyword]
            db.session.add(PTORequest(**p))
        for c in INITIAL_CONTRACTOR_LOGS:
            # pyrefly: ignore [unexpected-keyword]
            db.session.add(ContractorUnitLog(**c))
        
        db.session.commit()
        print("Database seeded successfully!")

if __name__ == '__main__':
    seed_db()
