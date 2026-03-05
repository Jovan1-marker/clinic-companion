import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ClinicSidebar from "@/components/ClinicSidebar";
import {
  Users, CalendarCheck, FolderOpen, Clock, MessageSquare,
  Plus, FileText, X, Check, Bold, Italic, Underline, List,
  AlignLeft, AlignCenter, AlignRight, Save, Megaphone,
  Search, Trash2, Pencil, CheckSquare, AlertTriangle, Activity
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

const strands = ["ICT", "GAS", "HUMSS", "STEM", "ABM"];

const AdminPortal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("Patient");

  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);

  const [patientSearch, setPatientSearch] = useState("");

  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");

  const [showEditPatient, setShowEditPatient] = useState(false);
  const [editPatient, setEditPatient] = useState<any>(null);

  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    full_name: "", lrn: "", grade: "", strand: "", section: "",
    height: "", weight: "", bmi_status: "", medical_history: "",
    clinic_exposure: "", email: "", home_address: "", contact_no: ""
  });

  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [recordTitle, setRecordTitle] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  const sidebarLinks = [
    { label: "Patient", icon: Users, onClick: () => setActiveSection("Patient") },
    { label: "Appointment", icon: CalendarCheck, onClick: () => setActiveSection("Appointment") },
    { label: "Record", icon: FolderOpen, onClick: () => setActiveSection("Record") },
    { label: "Waitlist", icon: Clock, onClick: () => setActiveSection("Waitlist") },
    { label: "Feedback", icon: MessageSquare, onClick: () => setActiveSection("Feedback") },
    { label: "Announcements", icon: Megaphone, onClick: () => setActiveSection("Announcements") },
  ];

  const isSHS = (grade: string) => grade === "11" || grade === "12";

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

  const loadData = async () => {
    const [pRes, aRes, wRes, fRes, rRes, annRes] = await Promise.all([
      supabase.from("patients").select("*").order("full_name"),
      supabase.from("appointments").select("*").eq("status", "pending").order("created_at"),
      supabase.from("appointments").select("*").in("status", ["approved", "waitlisted"]).order("created_at"),
      supabase.from("feedback").select("*").order("created_at", { ascending: false }),
      supabase.from("records").select("*").order("created_at", { ascending: false }),
      supabase.from("announcements").select("*").order("created_at", { ascending: false }),
    ]);
    if (pRes.data) setPatients(pRes.data);
    if (aRes.data) setAppointments(aRes.data);
    if (wRes.data) setWaitlist(wRes.data);
    if (fRes.data) setFeedback(fRes.data);
    if (rRes.data) setRecords(rRes.data);
    if (annRes.data) setAnnouncements(annRes.data);
  };

  const filteredPatients = patients.filter((p) => {
    const q = patientSearch.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(q) ||
      p.lrn?.toLowerCase().includes(q) ||
      p.grade?.toLowerCase().includes(q)
    );
  });

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("announcements").insert({
      title: announcementTitle,
      message: announcementMessage,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Announcement Posted!" });
      setShowAddAnnouncement(false);
      setAnnouncementTitle("");
      setAnnouncementMessage("");
      loadData();
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      loadData();
    }
  };

  const handleDeletePatient = async (id: string) => {
    const { error } = await supabase.from("patients").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Patient Deleted" });
      loadData();
    }
  };

  const openEditPatient = (p: any) => {
    const gradeStr = p.grade || "";
    let _grade = "", _strand = "", _section = "";
    const shsMatch = gradeStr.match(/^(\d+)\s+(\w+)\s*-\s*(.+)$/);
    const jhsMatch = gradeStr.match(/^(\d+)\s*-\s*(.+)$/);
    if (shsMatch) {
      _grade = shsMatch[1];
      _strand = shsMatch[2];
      _section = shsMatch[3].trim();
    } else if (jhsMatch) {
      _grade = jhsMatch[1];
      _section = jhsMatch[2].trim();
    } else {
      _grade = gradeStr;
    }
    setEditPatient({ ...p, _grade, _strand, _section });
    setShowEditPatient(true);
  };

  const handleEditPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPatient) return;

    const { id, _grade, _strand, _section } = editPatient;

    const gradeDisplay = _strand
      ? `${_grade} ${_strand} - ${_section}`
      : `${_grade} - ${_section}`;

    const updateData = {
      full_name: editPatient.full_name,
      lrn: editPatient.lrn || null,
      grade: gradeDisplay,
      height: editPatient.height || null,
      weight: editPatient.weight || null,
      bmi_status: editPatient.bmi_status || null,
      medical_history: editPatient.medical_history || null,
      clinic_exposure: editPatient.clinic_exposure || null,
      email: editPatient.email || null,
      home_address: editPatient.home_address || null,
      contact_no: editPatient.contact_no || null,
    };

    const { error } = await supabase.from("patients").update(updateData).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Patient Updated!" });
      setShowEditPatient(false);
      loadData();
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-emerald-700", "bg-blue-700", "bg-orange-600", "bg-purple-700",
      "bg-teal-700", "bg-rose-700", "bg-indigo-700", "bg-amber-700"
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const bmiStats = {
    total: patients.length,
    normal: patients.filter(p => p.bmi_status?.toLowerCase() === "normal").length,
    overweight: patients.filter(p => p.bmi_status?.toLowerCase() === "overweight").length,
    underweight: patients.filter(p => p.bmi_status?.toLowerCase() === "underweight").length,
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();

    const gradeDisplay = newPatient.strand
      ? `${newPatient.grade} ${newPatient.strand} - ${newPatient.section}`
      : `${newPatient.grade} - ${newPatient.section}`;

    const patientData = {
      full_name: newPatient.full_name,
      lrn: newPatient.lrn,
      grade: gradeDisplay,
      height: newPatient.height || null,
      weight: newPatient.weight || null,
      bmi_status: newPatient.bmi_status || null,
      medical_history: newPatient.medical_history || null,
      clinic_exposure: newPatient.clinic_exposure || null,
      email: newPatient.email || null,
      home_address: newPatient.home_address || null,
      contact_no: newPatient.contact_no || null,
    };

    const { error } = await supabase.from("patients").insert(patientData);
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

  const handleApproveClick = (appointmentId: string) => {
    setApprovingId(appointmentId);
    setSelectedDate(undefined);
    setShowCalendar(true);
  };

  const confirmApproval = async () => {
    if (!approvingId || !selectedDate) return;
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

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  return (
    <div className="flex min-h-screen">
      <ClinicSidebar links={sidebarLinks} title="Admin Portal" activeLink={activeSection} />
      <main className="flex-1 bg-background p-8 overflow-auto">

        {activeSection === "Patient" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Users className="w-6 h-6" /> Patients
                </h2>
                <p className="text-sm text-muted-foreground">Manage patient health profiles. Up to 50 patients.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search patients..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} className="pl-10 w-56" />
                </div>
                <Button onClick={() => setShowAddPatient(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Patient
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 mt-4">
              <div className="bg-card rounded-lg border border-border p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Patients</p>
                <p className="text-3xl font-bold text-foreground mt-1">{bmiStats.total}</p>
                <Users className="w-8 h-8 text-muted-foreground/30 ml-auto -mt-6" />
              </div>
              <div className="bg-card rounded-lg border border-border p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Normal BMI</p>
                <p className="text-3xl font-bold text-primary mt-1">{bmiStats.normal}</p>
                <CheckSquare className="w-8 h-8 text-muted-foreground/30 ml-auto -mt-6" />
              </div>
              <div className="bg-card rounded-lg border border-border p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overweight</p>
                <p className="text-3xl font-bold text-orange-500 mt-1">{bmiStats.overweight}</p>
                <AlertTriangle className="w-8 h-8 text-muted-foreground/30 ml-auto -mt-6" />
              </div>
              <div className="bg-card rounded-lg border border-border p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Underweight</p>
                <p className="text-3xl font-bold text-blue-500 mt-1">{bmiStats.underweight}</p>
                <Activity className="w-8 h-8 text-muted-foreground/30 ml-auto -mt-6" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredPatients.map((p) => (
                <div key={p.id} className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-full ${getAvatarColor(p.full_name)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                      {getInitials(p.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-card-foreground text-sm truncate">{p.full_name}</p>
                      <p className="text-xs text-muted-foreground">LRN: {p.lrn}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs mb-4">
                    <div>
                      <p className="text-muted-foreground uppercase font-semibold tracking-wider" style={{ fontSize: '10px' }}>Grade/Section</p>
                      <p className="text-card-foreground font-medium">{p.grade}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground uppercase font-semibold tracking-wider" style={{ fontSize: '10px' }}>BMI Status</p>
                      <p className="text-card-foreground font-medium">{p.bmi_status || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground uppercase font-semibold tracking-wider" style={{ fontSize: '10px' }}>Height</p>
                      <p className="text-card-foreground font-medium">{p.height || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground uppercase font-semibold tracking-wider" style={{ fontSize: '10px' }}>Weight</p>
                      <p className="text-card-foreground font-medium">{p.weight || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground uppercase font-semibold tracking-wider" style={{ fontSize: '10px' }}>Med History</p>
                      <p className="text-card-foreground font-medium">{p.medical_history || "None"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground uppercase font-semibold tracking-wider" style={{ fontSize: '10px' }}>Clinic Exposure</p>
                      <p className="text-card-foreground font-medium">{p.clinic_exposure || "None"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => openEditPatient(p)}>
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1 text-xs" onClick={() => handleDeletePatient(p.id)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Dialog open={showAddPatient} onOpenChange={setShowAddPatient}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add New Patient</DialogTitle></DialogHeader>
                <form onSubmit={handleAddPatient} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Full Name</label>
                    <Input value={newPatient.full_name} onChange={(e) => setNewPatient({ ...newPatient, full_name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">LRN</label>
                    <Input value={newPatient.lrn} onChange={(e) => setNewPatient({ ...newPatient, lrn: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Grade</label>
                    <Select value={newPatient.grade} onValueChange={(v) => setNewPatient({ ...newPatient, grade: v, strand: "", section: "" })}>
                      <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                      <SelectContent>
                        {["6", "7", "8", "9", "10", "11", "12"].map((g) => (<SelectItem key={g} value={g}>Grade {g}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  {isSHS(newPatient.grade) && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Strand</label>
                      <Select value={newPatient.strand} onValueChange={(v) => setNewPatient({ ...newPatient, strand: v })}>
                        <SelectTrigger><SelectValue placeholder="Select strand" /></SelectTrigger>
                        <SelectContent>
                          {strands.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {newPatient.grade && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Section</label>
                      <Input
                        value={newPatient.section}
                        onChange={(e) => setNewPatient({ ...newPatient, section: e.target.value })}
                        placeholder="e.g. THALES, EUCLID, or custom name"
                      />
                    </div>
                  )}
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
                  <DialogFooter><Button type="submit">Add Patient</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={showEditPatient} onOpenChange={setShowEditPatient}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Edit Patient</DialogTitle></DialogHeader>
                {editPatient && (
                  <form onSubmit={handleEditPatient} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Full Name</label>
                      <Input value={editPatient.full_name} onChange={(e) => setEditPatient({ ...editPatient, full_name: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">LRN</label>
                      <Input value={editPatient.lrn || ""} onChange={(e) => setEditPatient({ ...editPatient, lrn: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Grade</label>
                      <Select value={editPatient._grade || ""} onValueChange={(v) => setEditPatient({ ...editPatient, _grade: v, _strand: "" })}>
                        <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                        <SelectContent>
                          {["6", "7", "8", "9", "10", "11", "12"].map((g) => (<SelectItem key={g} value={g}>Grade {g}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    {isSHS(editPatient._grade || "") && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Strand</label>
                        <Select value={editPatient._strand || ""} onValueChange={(v) => setEditPatient({ ...editPatient, _strand: v })}>
                          <SelectTrigger><SelectValue placeholder="Select strand" /></SelectTrigger>
                          <SelectContent>
                            {strands.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {editPatient._grade && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Section</label>
                        <Input
                          value={editPatient._section || ""}
                          onChange={(e) => setEditPatient({ ...editPatient, _section: e.target.value })}
                          placeholder="e.g. THALES, EUCLID, or custom name"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Height</label>
                        <Input value={editPatient.height || ""} onChange={(e) => setEditPatient({ ...editPatient, height: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Weight</label>
                        <Input value={editPatient.weight || ""} onChange={(e) => setEditPatient({ ...editPatient, weight: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">BMI Status</label>
                      <Select value={editPatient.bmi_status || ""} onValueChange={(v) => setEditPatient({ ...editPatient, bmi_status: v })}>
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
                      <Input value={editPatient.medical_history || ""} onChange={(e) => setEditPatient({ ...editPatient, medical_history: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Clinic Exposure</label>
                      <Input value={editPatient.clinic_exposure || ""} onChange={(e) => setEditPatient({ ...editPatient, clinic_exposure: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <Input value={editPatient.email || ""} onChange={(e) => setEditPatient({ ...editPatient, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Home Address</label>
                      <Input value={editPatient.home_address || ""} onChange={(e) => setEditPatient({ ...editPatient, home_address: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Contact No.</label>
                      <Input value={editPatient.contact_no || ""} onChange={(e) => setEditPatient({ ...editPatient, contact_no: e.target.value })} />
                    </div>
                    <DialogFooter><Button type="submit">Save Changes</Button></DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
        )}

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

        {activeSection === "Record" && (
          <div>
            {editingRecord ? (
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
                <div
                  ref={editorRef}
                  contentEditable
                  className="bg-card border border-t-0 border-border rounded-b-lg min-h-[500px] p-6 focus:outline-none"
                  dangerouslySetInnerHTML={{ __html: editingRecord.content || "" }}
                />
              </div>
            ) : (
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
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${w.status === "approved" ? "bg-secondary text-primary" : "bg-accent/20 text-accent-foreground"}`}>
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

        {activeSection === "Announcements" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Manage Announcements</h2>
              <Button onClick={() => setShowAddAnnouncement(true)}>
                <Plus className="w-4 h-4 mr-2" /> New Announcement
              </Button>
            </div>
            {announcements.length === 0 ? (
              <div className="bg-card rounded-lg border border-border p-8 text-center">
                <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No announcements yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-w-2xl">
                {announcements.map((a) => (
                  <div key={a.id} className="bg-card rounded-lg border border-border p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-accent font-semibold mb-1">
                          {new Date(a.created_at).toLocaleDateString()}
                          {a.title && ` — ${a.title}`}
                        </p>
                        <p className="text-card-foreground">{a.message}</p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteAnnouncement(a.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Dialog open={showAddAnnouncement} onOpenChange={setShowAddAnnouncement}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Announcement</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddAnnouncement} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Title (optional)</label>
                    <Input value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} placeholder="e.g. Vaccination Schedule" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Message</label>
                    <Textarea value={announcementMessage} onChange={(e) => setAnnouncementMessage(e.target.value)} rows={4} required placeholder="Write your announcement..." />
                  </div>
                  <DialogFooter>
                    <Button type="submit">Post Announcement</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPortal;
