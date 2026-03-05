
-- Create announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage announcements"
  ON public.announcements
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- Everyone can read announcements (public facing)
CREATE POLICY "Anyone can view announcements"
  ON public.announcements
  FOR SELECT
  TO anon, authenticated
  USING (true);
