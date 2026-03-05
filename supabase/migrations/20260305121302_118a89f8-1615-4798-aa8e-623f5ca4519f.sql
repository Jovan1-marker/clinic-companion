-- =============================================
-- MIMS Database Schema
-- Medical Information Management System
-- =============================================

-- 1. PROFILES TABLE (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  lrn TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  home_address TEXT,
  contact_no TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check admin role (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, lrn, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'lrn', ''),
    NEW.email,
    'student'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. PATIENTS TABLE
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  lrn TEXT,
  grade TEXT,
  height TEXT,
  weight TEXT,
  bmi_status TEXT,
  medical_history TEXT,
  clinic_exposure TEXT,
  email TEXT,
  home_address TEXT,
  contact_no TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can do everything with patients" ON public.patients FOR ALL USING (public.is_admin());

-- 3. APPOINTMENTS TABLE
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name TEXT,
  lrn TEXT,
  service_type TEXT NOT NULL,
  grade TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own appointments" ON public.appointments FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can create appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Admins can view all appointments" ON public.appointments FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update appointments" ON public.appointments FOR UPDATE USING (public.is_admin());

-- 4. FEEDBACK TABLE
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can create feedback" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Admins can view all feedback" ON public.feedback FOR SELECT USING (public.is_admin());

-- 5. RECORDS TABLE (medical records/documents)
CREATE TABLE public.records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Untitled Document',
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can do everything with records" ON public.records FOR ALL USING (public.is_admin());

-- =============================================
-- SEED DATA: 10 pre-filled patients
-- =============================================
INSERT INTO public.patients (full_name, lrn, grade, height, weight, bmi_status, medical_history, clinic_exposure) VALUES
('Jake Patrick A. Baron', '136888141225', '12 ICT - THALES', '165cm', '59kg', 'Normal', 'Asthma', 'None'),
('Caylle Nathaniel D. Rico', '488051150121', '12 ICT - THALES', '156cm', '45kg', 'Normal', 'None', 'None'),
('Mart D. Bernacer', '136591131208', '12 ICT - THALES', '160cm', '43kg', 'Normal', 'None', 'None'),
('Christian B. Rasonabe', '136891131615', '12 ICT - THALES', '159cm', '60kg', 'Normal', 'None', 'None'),
('Jhon Carl D Villacarlos', '136886150197', '12 ICT - THALES', '165cm', '70kg', 'Overweight', 'None', 'None'),
('Haezel Marie B. Maganding', '136514120335', '12 ICT - THALES', '162cm', '40kg', 'Underweight', 'None', 'yes 3 times'),
('Roncedrick A. Relampagos', '136891131844', '12 ICT - THALES', '5''4', '58kg', 'Normal', 'None', 'None'),
('Dhan Alfred E. Ordeniza', '488047150113', '12 ICT - THALES', '171cm', '60kg', 'Normal', 'Anemic', 'yes 4 times'),
('Lance jhenel O. Avila', '136885140567', '12 ICT - THALES', '166cm', '54kg', 'Normal', 'Asthma', 'None'),
('Zyron Drei D. Nacionales', '407278150268', '12 ICT - THALES', '180cm', '116kg', 'Overweight', 'High Blood', 'yes 3 times');