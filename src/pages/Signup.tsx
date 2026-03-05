/**
 * Signup Page
 * Students register with their LRN and name.
 * Creates a Supabase auth user and a profile entry.
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Stethoscope, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [lrn, setLrn] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * Register new student account
   * 1. Create auth user with Supabase
   * 2. Insert profile with LRN and name (handled by database trigger)
   */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      /* Create auth user */
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            lrn: lrn,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Account Created!",
        description: "You can now log in with your credentials.",
      });
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Signup Failed",
        description: error.message || "Could not create account.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Stethoscope className="w-10 h-10 text-primary" />
            <h1 className="text-2xl font-bold text-secondary-foreground">MIMS</h1>
          </div>
          <p className="text-muted-foreground">Create your student account</p>
        </div>

        {/* Signup card */}
        <div className="bg-card rounded-lg border border-border p-8 shadow-sm">
          <form onSubmit={handleSignup} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Full Name
              </label>
              <Input
                type="text"
                placeholder="e.g. Juan Dela Cruz"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* LRN */}
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Learner Reference Number (LRN)
              </label>
              <Input
                type="text"
                placeholder="e.g. 136888141225"
                value={lrn}
                onChange={(e) => setLrn(e.target.value)}
                required
                maxLength={12}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Sign Up"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Log In
            </Link>
          </p>
        </div>

        <p className="text-center mt-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
