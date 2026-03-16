-- Enable RLS on all tables
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE triage_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Hospitals are viewable by everyone" ON hospitals;
DROP POLICY IF EXISTS "Users can only see their own profile" ON users;
DROP POLICY IF EXISTS "Hospital admins can see all users in their hospital" ON users;
DROP POLICY IF EXISTS "Patients can only see their own triage sessions" ON triage_sessions;
DROP POLICY IF EXISTS "Doctors can see triage sessions for their hospital" ON triage_sessions;
DROP POLICY IF EXISTS "Hospital admins can see triage sessions for their hospital" ON triage_sessions;

-- Policies for "hospitals"
CREATE POLICY "Hospitals are viewable by everyone" ON hospitals
    FOR SELECT USING (true);

-- Policies for "users"
CREATE POLICY "Users can only see their own profile" ON users
    FOR ALL USING (auth.uid()::text = id);

CREATE POLICY "Hospital admins can see all users in their hospital" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users AS admin
            WHERE admin.id = auth.uid()::text 
            AND admin.role = 'hospital_admin' 
            AND admin.hospital_id = users.hospital_id
        )
    );

-- Policies for "triage_sessions"
CREATE POLICY "Patients can only see their own triage sessions" ON triage_sessions
    FOR SELECT USING (patient_id = auth.uid()::text);

CREATE POLICY "Doctors can see triage sessions for their hospital" ON triage_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users AS doc
            WHERE doc.id = auth.uid()::text
            AND doc.role = 'doctor'
            AND doc.hospital_id = triage_sessions.hospital_id
        )
    );

CREATE POLICY "Hospital admins can see triage sessions for their hospital" ON triage_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users AS admin
            WHERE admin.id = auth.uid()::text
            AND admin.role = 'hospital_admin'
            AND admin.hospital_id = triage_sessions.hospital_id
        )
    );
