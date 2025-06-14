import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const TvShows = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to home since only Movies and Web Series should be available
    navigate('/');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-foreground">Redirecting...</div>
    </div>
  );
};

export default TvShows;