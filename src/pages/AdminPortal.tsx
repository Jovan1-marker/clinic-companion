/**
 * Admin Portal
 * Dashboard for clinic administrators to manage:
 * - Patients (grid of cards, add new patient with grade/strand/section)
 * - Appointments (approve with calendar popup, auto-waitlist after 5)
 * - Waitlist (overflow appointments)
 * - Records (Google Docs-like file manager with rich text editor)
 * - Feedback (view student comments)
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ClinicSidebar from "@/components/ClinicSidebar";
import {
  Users, CalendarCheck, FolderOpen, Clock, MessageSquare,
  Plus, FileText, X, Check, Bold, Italic, Underline, List,
  AlignLeft, AlignCenter, AlignRight, Save, UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

/* Strands for SHS (Grade 11-12) */
const strands = ["ICT", "GAS", "HUMSS", "STEM", "ABM"];

const AdminPortal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("Patient");

  /* Data state */
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);

  /* Add patient modal state */
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    full_name: "", lrn: "", grade: "", strand: "", section: "",
    height: "", weight: "", bmi_status: "", medical_history: "",
    clinic_exposure: "", email: "", home_address: "", contact_no: ""
  });

  /* Calendar approval dialog */
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  /* Record editor state */
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [recordTitle, setRecordTitle] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  /* Sidebar links */
  const sidebarLinks = [
    { label: "Patient", icon: Users, onClick: () => setActiveSection("Patient") },
    { label: "Appointment", icon: CalendarCheck, onClick: () => setActiveSection("Appointment") },
    { label: "Record", icon: FolderOpen, onClick: () => setActiveSection("Record") },
    { label: "Waitlist", icon: Clock, onClick: () => setActiveSection("Waitlist") },
    { label: "Feedback", icon: MessageSquare, onClick: () => setActiveSection("Feedback") },
  ];

  /* Check admin auth and load all data */
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (prof?.role !== "admin") { navigate("/login"); return; }

      loadData();
    };
    init();
  }, [navigate]);

  /* Load all data from Supabase */
  const loadData = async () => {
    const [pRes, aRes, wRes, fRes, rRes] = await Promise.all([
      supabase.from("patients").select("*").order("full_name"),
      supabase.from("appointments").select("*").eq("status", "pending").order("created_at"),
      supabase.from("appointments").select("*").in("status", ["approved", "waitlisted"]).order("created_at"),
      supabase.from("feedback").select("*").order("created_at", { ascending: false }),
      supabase.from("records").select("*").order("created_at", { ascending: false }),
    ]);
    if (pRes.data) setPatients(pRes.data);
    if (aRes.data) setAppointments(aRes.data);
    if (wRes.data) setWaitlist(wRes.data);
    if (fRes.data) setFeedback(fRes.data);
    if (rRes.data) setRecords(rRes.data);
  };

  /* Check if grade is SHS (11 or 12) */
  const isSHS = (grade: string) => grade === "11" || grade === "12";

  /* Add new patient */
  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const gradeDisplay = newPatient.strand
      ? `${newPatient.grade} ${newPatient.strand} - ${newPatient.section}`
      : `${newPatient.grade} - ${newPatient.section}`;

    const { error } = await supabase.from("patients").insert({
      ...newPatient,
      grade: gradeDisplay,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Patient Added!" });
      setShowAddPatient(false);
      setNewPatient({
        full_name: "", lrn: "", grade: "", strand: "", section: "",
        height: "", weight: "", bmi_status: "", medical_history: "",
        clinic_exposure: "", email: "", home_address: "", contact_no: ""
      });
      loadData();
    }
  };

  /* Open calendar dialog to approve appointment */
  const handleApproveClick = (appointmentId: string) => {
    setApprovingId(appointmentId);
    setSelectedDate(undefined);
    setShowCalendar(true);
  };

  /* Confirm approval with selected date */
  const confirmApproval = async () => {
    if (!approvingId || !selectedDate) return;

    /* Count currently approved appointments */
    const { count } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved");

    const status = (count || 0) >= 5 ? "waitlisted" : "approved";

    const { error } = await supabase
      .from("appointments")
      .update({
        status,
        scheduled_date: selectedDate.toISOString(),
      })
      .eq("id", approvingId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: status === "approved" ? "Appointment Approved!" : "Added to Waitlist",
        description: status === "waitlisted"
          ? "Max 5 appointments reached. This one was waitlisted."
          : `Scheduled for ${selectedDate.toLocaleDateString()}`,
      });
      setShowCalendar(false);
      loadData();
    }
  };

  /* Create a new medical record */
  const handleCreateRecord = async () => {
    const { data, error } = await supabase.from("records").insert({
      title: "Untitled Document",
      content: "",
    }).select().single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setRecords([data, ...records]);
      setEditingRecord(data);
      setRecordTitle(data.title);
    }
  };

  /* Save record content */
  const handleSaveRecord = async () => {
    if (!editingRecord) return;
    const content = editorRef.current?.innerHTML || "";

    const { error } = await supabase
      .from("records")
      .update({ title: recordTitle, content })
      .eq("id", editingRecord.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Record Saved!" });
      loadData();
    }
  };

  /* Rich text formatting commands */
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  return (
    <div className="flex min-h-screen">
      <ClinicSidebar links={sidebarLinks} title="Admin Portal" activeLink={activeSection} />

      <main className="flex-1 bg-background p-8 overflow-auto">
        {/* ===== PATIENTS ===== */}
        {activeSection === "Patient" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Patients</h2>
              <Button onClick={() => setShowAddPatient(true)}>
                <UserPlus className="w-4 h-4 mr-2" /> Add Patient
              </Button>
            </div>

            {/* Patient cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patients.map((p) => (
                <div key={p.id} className="bg-card rounded-lg border border-border p-5 hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-card-foreground text-lg mb-2">{p.full_name}</h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p><span className="font-medium text-card-foreground">LRN:</span> {p.lrn}</p>
                    <p><span className="font-medium text-card-foreground">Grade:</span> {p.grade}</p>
                    <p><span className="font-medium text-card-foreground">Height:</span> {p.height}</p>
                    <p><span className="font-medium text-card-foreground">Weight:</span> {p.weight}</p>
                    <p><span className="font-medium text-card-foreground">BMI:</span> {p.bmi_status}</p>
                    <p><span className="font-medium text-card-foreground">History:</span> {p.medical_history || "None"}</p>
                    <p><span className="font-medium text-card-foreground">Clinic Exposure:</span> {p.clinic_exposure || "None"}</p>
                    <hr className="my-2 border-border" />
                    <p><span className="font-medium text-card-foreground">Email:</span> {p.email || "—"}</p>
                    <p><span className="font-medium text-card-foreground">Address:</span> {p.home_address || "—"}</p>
                    <p><span className="font-medium text-card-foreground">Contact:</span> {p.contact_no || "—"}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Patient Dialog */}
            <Dialog open={showAddPatient} onOpenChange={setShowAddPatient}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Patient</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddPatient} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Full Name</label>
                    <Input value={newPatient.full_name} onChange={(e) => setNewPatient({ ...newPatient, full_name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">LRN</label>
                    <Input value={newPatient.lrn} onChange={(e) => setNewPatient({ ...newPatient, lrn: e.target.value })} required />
                  </div>

                  {/* Grade dropdown (7-12) */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Grade</label>
                    <Select value={newPatient.grade} onValueChange={(v) => setNewPatient({ ...newPatient, grade: v, strand: "" })}>
                      <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                      <SelectContent>
                        {["7", "8", "9", "10", "11", "12"].map((g) => (
                          <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Strand dropdown (only for grade 11-12) */}
                  {isSHS(newPatient.grade) && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Strand</label>
                      <Select value={newPatient.strand} onValueChange={(v) => setNewPatient({ ...newPatient, strand: v })}>
                        <SelectTrigger><SelectValue placeholder="Select strand" /></SelectTrigger>
                        <SelectContent>
                          {strands.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Section - free text */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Section</label>
                    <Input
                      placeholder="e.g. THALES"
                      value={newPatient.section}
                      onChange={(e) => setNewPatient({ ...newPatient, section: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Height</label>
                      <Input placeholder="e.g. 165cm" value={newPatient.height} onChange={(e) => setNewPatient({ ...newPatient, height: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Weight</label>
                      <Input placeholder="e.g. 59kg" value={newPatient.weight} onChange={(e) => setNewPatient({ ...newPatient, weight: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">BMI Status</label>
                    <Select value={newPatient.bmi_status} onValueChange={(v) => setNewPatient({ ...newPatient, bmi_status: v })}>
                      <SelectTrigger><SelectValue placeholder="Select BMI status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Underweight">Underweight</SelectItem>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Overweight">Overweight</SelectItem>
                        <SelectItem value="Obese">Obese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Medical History</label>
                    <Input placeholder="e.g. Asthma" value={newPatient.medical_history} onChange={(e) => setNewPatient({ ...newPatient, medical_history: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Clinic Exposure</label>
                    <Input placeholder="e.g. yes 3 times" value={newPatient.clinic_exposure} onChange={(e) => setNewPatient({ ...newPatient, clinic_exposure: e.target.value })} />
                  </div>

                  <DialogFooter>
                    <Button type="submit">Add Patient</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* ===== APPOINTMENTS ===== */}
        {activeSection === "Appointment" && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">Pending Appointments</h2>
            {appointments.length === 0 ? (
              <div className="bg-card rounded-lg border border-border p-8 text-center">
                <CalendarCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No pending appointments.</p>
              </div>
            ) : (
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-secondary">
                      <th className="text-left p-4 text-sm font-semibold text-secondary-foreground">Student</th>
                      <th className="text-left p-4 text-sm font-semibold text-secondary-foreground">LRN</th>
                      <th className="text-left p-4 text-sm font-semibold text-secondary-foreground">Service</th>
                      <th className="text-left p-4 text-sm font-semibold text-secondary-foreground">Grade</th>
                      <th className="text-left p-4 text-sm font-semibold text-secondary-foreground">Description</th>
                      <th className="text-left p-4 text-sm font-semibold text-secondary-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appt) => (
                      <tr key={appt.id} className="border-t border-border">
                        <td className="p-4 text-sm text-card-foreground">{appt.student_name}</td>
                        <td className="p-4 text-sm text-card-foreground">{appt.lrn}</td>
                        <td className="p-4 text-sm text-card-foreground">{appt.service_type}</td>
                        <td className="p-4 text-sm text-card-foreground">{appt.grade}</td>
                        <td className="p-4 text-sm text-muted-foreground max-w-xs truncate">{appt.description}</td>
                        <td className="p-4">
                          <Button size="sm" onClick={() => handleApproveClick(appt.id)}>
                            <Check className="w-4 h-4 mr-1" /> Approve
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Calendar Approval Dialog */}
            <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select Appointment Date</DialogTitle>
                </DialogHeader>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    className="pointer-events-auto"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCalendar(false)}>Cancel</Button>
                  <Button onClick={confirmApproval} disabled={!selectedDate}>Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* ===== RECORDS (Google Docs-like) ===== */}
        {activeSection === "Record" && (
          <div>
            {editingRecord ? (
              /* ---- Rich Text Editor ---- */
              <div className="record-editor">
                <div className="flex items-center justify-between mb-4">
                  <Input
                    value={recordTitle}
                    onChange={(e) => setRecordTitle(e.target.value)}
                    className="text-xl font-bold border-none bg-transparent shadow-none max-w-md"
                    placeholder="Document Title"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveRecord}>
                      <Save className="w-4 h-4 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingRecord(null); loadData(); }}>
                      <X className="w-4 h-4 mr-1" /> Close
                    </Button>
                  </div>
                </div>

                {/* Toolbar */}
                <div className="bg-card border border-border rounded-t-lg p-2 flex gap-1 flex-wrap">
                  <button onClick={() => execCommand("bold")} className="p-2 rounded hover:bg-secondary"><Bold className="w-4 h-4" /></button>
                  <button onClick={() => execCommand("italic")} className="p-2 rounded hover:bg-secondary"><Italic className="w-4 h-4" /></button>
                  <button onClick={() => execCommand("underline")} className="p-2 rounded hover:bg-secondary"><Underline className="w-4 h-4" /></button>
                  <div className="w-px bg-border mx-1" />
                  <button onClick={() => execCommand("justifyLeft")} className="p-2 rounded hover:bg-secondary"><AlignLeft className="w-4 h-4" /></button>
                  <button onClick={() => execCommand("justifyCenter")} className="p-2 rounded hover:bg-secondary"><AlignCenter className="w-4 h-4" /></button>
                  <button onClick={() => execCommand("justifyRight")} className="p-2 rounded hover:bg-secondary"><AlignRight className="w-4 h-4" /></button>
                  <div className="w-px bg-border mx-1" />
                  <button onClick={() => execCommand("insertUnorderedList")} className="p-2 rounded hover:bg-secondary"><List className="w-4 h-4" /></button>
                  <div className="w-px bg-border mx-1" />
                  <select onChange={(e) => execCommand("fontSize", e.target.value)} className="text-sm bg-background border border-border rounded px-2 py-1">
                    <option value="3">Normal</option>
                    <option value="1">Small</option>
                    <option value="5">Large</option>
                    <option value="7">Huge</option>
                  </select>
                  <select onChange={(e) => execCommand("formatBlock", e.target.value)} className="text-sm bg-background border border-border rounded px-2 py-1">
                    <option value="p">Paragraph</option>
                    <option value="h1">Heading 1</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                  </select>
                </div>

                {/* Editable content area */}
                <div
                  ref={editorRef}
                  contentEditable
                  className="bg-card border border-t-0 border-border rounded-b-lg min-h-[500px] p-6 focus:outline-none"
                  dangerouslySetInnerHTML={{ __html: editingRecord.content || "" }}
                />
              </div>
            ) : (
              /* ---- File Manager Grid ---- */
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground">Medical Records</h2>
                  <Button onClick={handleCreateRecord}>
                    <Plus className="w-4 h-4 mr-2" /> Create New Record
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {records.map((rec) => (
                    <button
                      key={rec.id}
                      onClick={() => { setEditingRecord(rec); setRecordTitle(rec.title); }}
                      className="bg-card rounded-lg border border-border p-4 hover:shadow-md hover:border-accent transition-all text-center group"
                    >
                      <FileText className="w-12 h-12 text-primary mx-auto mb-3 group-hover:text-accent transition-colors" />
                      <p className="text-sm font-medium text-card-foreground truncate">{rec.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(rec.created_at).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>

                {records.length === 0 && (
                  <div className="bg-card rounded-lg border border-border p-12 text-center mt-4">
                    <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No records yet. Create your first medical record.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== WAITLIST ===== */}
        {activeSection === "Waitlist" && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">Appointment Waitlist</h2>
            {waitlist.length === 0 ? (
              <div className="bg-card rounded-lg border border-border p-8 text-center">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No appointments in waitlist.</p>
              </div>
            ) : (
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-secondary">
                      <th className="text-left p-4 text-sm font-semibold text-secondary-foreground">Student</th>
                      <th className="text-left p-4 text-sm font-semibold text-secondary-foreground">Service</th>
                      <th className="text-left p-4 text-sm font-semibold text-secondary-foreground">Status</th>
                      <th className="text-left p-4 text-sm font-semibold text-secondary-foreground">Scheduled</th>
                      <th className="text-left p-4 text-sm font-semibold text-secondary-foreground">Requested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitlist.map((w) => (
                      <tr key={w.id} className="border-t border-border">
                        <td className="p-4 text-sm text-card-foreground">{w.student_name}</td>
                        <td className="p-4 text-sm text-card-foreground">{w.service_type}</td>
                        <td className="p-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold
                            ${w.status === "approved" ? "bg-secondary text-primary" : "bg-accent/20 text-accent-foreground"}
                          `}>
                            {w.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-card-foreground">
                          {w.scheduled_date ? new Date(w.scheduled_date).toLocaleDateString() : "—"}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(w.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== FEEDBACK ===== */}
        {activeSection === "Feedback" && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">Student Feedback</h2>
            {feedback.length === 0 ? (
              <div className="bg-card rounded-lg border border-border p-8 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No feedback received yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feedback.map((f) => (
                  <div key={f.id} className="bg-card rounded-lg border border-border p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-card-foreground">{f.student_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(f.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{f.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPortal;
