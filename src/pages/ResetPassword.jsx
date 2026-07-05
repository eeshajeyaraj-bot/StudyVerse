import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleReset() {
    if (!password) return alert("Enter a new password");

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      alert("Password updated successfully!");
      navigate("/login");
    }
  }

  return (
    <div style={{
      display:"flex",
      justifyContent:"center",
      alignItems:"center",
      minHeight:"100vh",
      background:"#120b24"
    }}>
      <div style={{
        width:"380px",
        background:"#1b1233",
        padding:"30px",
        borderRadius:"12px"
      }}>
        <h2 style={{color:"white"}}>Reset Password</h2>

        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          style={{
            width:"100%",
            padding:"12px",
            marginTop:"20px",
            marginBottom:"20px"
          }}
        />

        <button
          onClick={handleReset}
          disabled={loading}
          style={{
            width:"100%",
            padding:"12px"
          }}
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </div>
    </div>
  );
}