import DashboardHeader from '@/components/DashboardHeader';
import KPICards from '@/components/KPICards';
import FraudCharts from '@/components/FraudCharts';
import ClaimsTable from '@/components/ClaimsTable';
import WhistleblowerAlerts from '@/components/WhistleblowerAlerts';
import ChatBot from '@/components/ChatBot';

const Index = () => {
  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-[1400px] mx-auto">
        <DashboardHeader />
        <WhistleblowerAlerts />
        <KPICards />
        <FraudCharts />
        <ClaimsTable />
      </div>
      <ChatBot />
    </div>
  );
};

export default Index;
