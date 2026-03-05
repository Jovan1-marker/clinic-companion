/**
 * Student Portal
 * Dashboard for students to:
 * - View their appointment statuses
 * - Request new appointments
 * - View announcements
 * - Submit feedback/comments
 * - Edit their profile settings
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ClinicSidebar from "@/components/ClinicSidebar";
import { CalendarCheck, CalendarPlus, Megaphone, MessageSquare, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* Available clinic services for dropdown */
const clinicServices = [
  "General Checkup",
  "First Aid",
  "Medicine Dispensing",
  "Health Counseling",
  "BMI Monitoring",
  "Medical Certificate",
];

const StudentPortal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("My Appointments");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  /* Appointment request form state */
  const [serviceType, setServiceType] = useState("");
  const [appointmentName, setAppointmentName] = useState("");
  const [appointmentGrade, setAppointmentGrade] = useState("");
  const [appointmentLrn, setAppointmentLrn] = useState("");
  const [appointmentDesc, setAppointmentDesc] = useState("");

  /* Comment form state */
  const [commentText, setCommentText] = useState("");

  /* Data state */
  const [appointments, setAppointments] = useState<any[]>([]);

  /* Settings form state */
  const [settingsName, setSettingsName] = useState("");
  const [settingsAddress, setSettingsAddress] = useState("");
  const [settingsContact, setSettingsContact] = useState("");
  const [settingsEmail, setSettingsEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  /* Sidebar navigation links */
  const sidebarLinks = [
    { label: "My Appointments", icon: CalendarCheck, onClick: () => setActiveSection("My Appointments") },
    { label: "Request Appointment", icon: CalendarPlus, onClick: () => setActiveSection("Request Appointment") },
    { label: "Announcements", icon: Megaphone, onClick: () => setActiveSection("Announcements") },
    { label: "Comment", icon: MessageSquare, onClick: () => setActiveSection("Comment") },
    { label: "Settings", icon: Settings, onClick: () => setActiveSection("Settings") },
  ];

  /* Check auth and load user data on mount */
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUser(user);

      /* Load profile */
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      
      if (prof) {
        setProfile(prof);
        setSettingsName(prof.full_name || "");
        setSettingsAddress(prof.home_address || "");
        setSettingsContact(prof.contact_no || "");
        setSettingsEmail(user.email || "");
        setAppointmentName(prof.full_name || "");
        setAppointmentLrn(prof.lrn || "");
      }

      /* Load student appointments */
      const { data: appts } = await supabase
        .from("appointments")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });
      
      if (appts) setAppointments(appts);
    };
    checkAuth();
  }, [navigate]);

  /* Submit appointment request */
  const handleRequestAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase.from("appointments").insert({
      student_id: user.id,
      service_type: serviceType,
      student_name: appointmentName,
      grade: appointmentGrade,
      lrn: appointmentLrn,
      description: appointmentDesc,
      status: "pending",
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Appointment request submitted!" });
      setServiceType("");
      setAppointmentDesc("");
      setAppointmentGrade("");
      /* Refresh appointments */
      const { data } = await supabase
        .from("appointments")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setAppointments(data);
    }
  };

  /* Submit feedback comment */
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase.from("feedback").insert({
      student_id: user.id,
      student_name: profile?.full_name || "Anonymous",
      message: commentText,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Feedback Sent!", description: "Thank you for your feedback." });
      setCommentText("");
    }
  };

  /* Update profile settings */
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: settingsName,
        home_address: settingsAddress,
        contact_no: settingsContact,
      })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile Updated!" });
    }

    /* Update password if provided */
    if (newPassword.length >= 6) {
      const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword });
      if (pwErr) {
        toast({ title: "Password Error", description: pwErr.message, variant: "destructive" });
      } else {
        toast({ title: "Password Updated!" });
        setNewPassword("");
      }
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <ClinicSidebar links={sidebarLinks} title="Student Portal" activeLink={activeSection} />

      {/* Main content area */}
      <main className="flex-1 bg-background p-8">
        {/* ===== MY APPOINTMENTS ===== */}
        {activeSection === "My Appointments" && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">My Appointments</h2>
            {appointments.length === 0 ? (
              <div className="bg-card rounded-lg border border-border p-8 text-center">
                <CalendarCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No appointments yet. Request one from the sidebar!</p>
              </div>
            ) : (
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-secondary">
                      <th className="text-left p-4 text-sm font-semibold text-secondary-foreground">Service</th>
                      <th className="text-left p-4 text-sm font-semibold text-secondary-foreground">Status</th>
                      <th className="text-left p-4 text-sm font-semibold text-secondary-foreground">Schedule</th>
                      <th className="text-left p-4 text-sm font-semibold text-secondary-foreground">Date Requested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appt) => (
                      <tr key={appt.id} className="border-t border-border">
                        <td className="p-4 text-sm text-card-foreground">{appt.service_type}</td>
                        <td className="p-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold
                            ${appt.status === "approved" ? "bg-secondary text-primary" : ""}
                            ${appt.status === "pending" ? "bg-accent/20 text-accent-foreground" : ""}
                            ${appt.status === "waitlisted" ? "bg-muted text-muted-foreground" : ""}
                          `}>
                            {appt.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-card-foreground">
                          {appt.scheduled_date ? new Date(appt.scheduled_date).toLocaleDateString() : "—"}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(appt.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== REQUEST APPOINTMENT ===== */}
        {activeSection === "Request Appointment" && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">Request Appointment</h2>
            <div className="bg-card rounded-lg border border-border p-8 max-w-2xl">
              <form onSubmit={handleRequestAppointment} className="space-y-5">
                {/* Service Type dropdown */}
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Type of Clinic Service
                  </label>
                  <Select value={serviceType} onValueChange={setServiceType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {clinicServices.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">Name</label>
                  <Input value={appointmentName} onChange={(e) => setAppointmentName(e.target.value)} required />
                </div>

                {/* Grade */}
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">Grade & Section</label>
                  <Input
                    placeholder="e.g. 12 ICT - THALES"
                    value={appointmentGrade}
                    onChange={(e) => setAppointmentGrade(e.target.value)}
                    required
                  />
                </div>

                {/* LRN */}
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">LRN</label>
                  <Input value={appointmentLrn} onChange={(e) => setAppointmentLrn(e.target.value)} required />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Description of Appointment
                  </label>
                  <Textarea
                    placeholder="Describe your concern..."
                    value={appointmentDesc}
                    onChange={(e) => setAppointmentDesc(e.target.value)}
                    rows={4}
                    required
                  />
                </div>

                <Button type="submit">Submit Request</Button>
              </form>
            </div>
          </div>
        )}

        {/* ===== ANNOUNCEMENTS ===== */}
        {activeSection === "Announcements" && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">Announcements</h2>
            <div className="space-y-4 max-w-2xl">
              <div className="bg-card rounded-lg border border-border p-5">
                <p className="text-sm text-accent font-semibold mb-1">March 5, 2026</p>
                <p className="text-card-foreground">Annual physical examinations begin next week.</p>
              </div>
              <div className="bg-card rounded-lg border border-border p-5">
                <p className="text-sm text-accent font-semibold mb-1">March 1, 2026</p>
                <p className="text-card-foreground">Flu vaccines are now available at the clinic.</p>
              </div>
            </div>
          </div>
        )}

        {/* ===== COMMENT / FEEDBACK ===== */}
        {activeSection === "Comment" && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">Submit Feedback</h2>
            <div className="bg-card rounded-lg border border-border p-8 max-w-2xl">
              <form onSubmit={handleSubmitComment} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Your Feedback
                  </label>
                  <Textarea
                    placeholder="Share your thoughts, suggestions, or concerns..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={6}
                    required
                  />
                </div>
                <Button type="submit">Send Feedback</Button>
              </form>
            </div>
          </div>
        )}

        {/* ===== SETTINGS ===== */}
        {activeSection === "Settings" && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">Account Settings</h2>
            <div className="bg-card rounded-lg border border-border p-8 max-w-2xl">
              <form onSubmit={handleUpdateSettings} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">Full Name</label>
                  <Input value={settingsName} onChange={(e) => setSettingsName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">Email (read-only)</label>
                  <Input value={settingsEmail} readOnly className="bg-muted" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">Home Address</label>
                  <Input
                    placeholder="Enter your home address"
                    value={settingsAddress}
                    onChange={(e) => setSettingsAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">Contact No.</label>
                  <Input
                    placeholder="Enter your contact number"
                    value={settingsContact}
                    onChange={(e) => setSettingsContact(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    New Password <span className="text-muted-foreground">(leave blank to keep current)</span>
                  </label>
                  <Input
                    type="password"
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                  />
                </div>
                <Button type="submit">Save Changes</Button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentPortal;
