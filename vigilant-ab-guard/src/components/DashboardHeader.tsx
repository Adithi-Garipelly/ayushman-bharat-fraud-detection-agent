import { Shield, Bell, Activity, Users, Settings2, Home, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';

const DashboardHeader = () => {
  const location = useLocation();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-6 py-4 glass-card mb-6"
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 glow-primary">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Ayushman Bharat <span className="text-gradient-primary">Fraud Detection</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Real-time Claim Monitoring & Anomaly Detection Agent
            </p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-2 border-l border-border/50 pl-6 ml-2">
          <Link to="/">
            <button className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
              <Home className="w-4 h-4" />
              Dashboard
            </button>
          </Link>
          <Link to="/beneficiaries">
            <button className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/beneficiaries' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
              <Users className="w-4 h-4" />
              Beneficiaries
            </button>
          </Link>
          <Link to="/manual">
            <button className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/manual' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
              <Settings2 className="w-4 h-4" />
              Manual Search
            </button>
          </Link>
          <Link to="/portal">
            <button className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/portal' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
              <User className="w-4 h-4" />
              Patient Portal
            </button>
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
          <Activity className="w-3.5 h-3.5 text-success animate-pulse-glow" />
          <span className="text-xs font-medium text-success">Agent Active</span>
        </div>
        <button className="relative p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-[10px] font-bold flex items-center justify-center text-destructive-foreground">
            7
          </span>
        </button>
      </div>
    </motion.header>
  );
};

export default DashboardHeader;
