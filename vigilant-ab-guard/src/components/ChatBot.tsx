import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, Bot, User, Loader2 } from 'lucide-react';
import { mockClaims, hospitalStats, fraudTypeDistribution, stateWiseFraud } from '@/data/mockClaims';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const getAIResponse = (input: string): string => {
  const q = input.toLowerCase();

  if (q.includes('total claim') || q.includes('how many claim')) {
    const total = mockClaims.length;
    const flagged = mockClaims.filter(c => c.flagged).length;
    return `📊 We have **${total} total claims** in the system. Of these, **${flagged} claims (${((flagged/total)*100).toFixed(1)}%)** have been flagged for potential fraud.`;
  }

  if (q.includes('highest risk') || q.includes('most fraud') || q.includes('worst hospital')) {
    const worst = [...hospitalStats].sort((a, b) => b.avgRiskScore - a.avgRiskScore)[0];
    return `🏥 **${worst.hospitalName}** in ${worst.state} has the highest average risk score of **${worst.avgRiskScore}/100** with ${worst.flaggedClaims} flagged claims out of ${worst.totalClaims} total.`;
  }

  if (q.includes('upcoding')) {
    const upcoded = mockClaims.filter(c => c.fraudType === 'upcoding');
    return `📈 **Upcoding Analysis**: ${upcoded.length} claims detected with upcoding patterns. Average overcharge is **${((upcoded.reduce((s,c) => s + (c.claimAmount - c.expectedAmount), 0) / upcoded.length) / 1000).toFixed(0)}K above expected**. Common in procedures like Knee Replacement and Cardiac Bypass.`;
  }

  if (q.includes('ghost') || q.includes('ghost billing')) {
    const ghost = mockClaims.filter(c => c.fraudType === 'ghost_billing');
    return `👻 **Ghost Billing**: ${ghost.length} suspected ghost billing incidents detected. These claims have no verifiable patient records. Total suspicious amount: **₹${(ghost.reduce((s,c) => s + c.claimAmount, 0) / 100000).toFixed(1)}L**.`;
  }

  if (q.includes('state') || q.includes('which state')) {
    const worst = [...stateWiseFraud].sort((a, b) => (b.flagged / b.claims) - (a.flagged / a.claims))[0];
    return `📍 **${worst.state}** has the highest fraud rate at **${((worst.flagged / worst.claims) * 100).toFixed(1)}%** with ${worst.flagged} flagged claims out of ${worst.claims}.`;
  }

  if (q.includes('save') || q.includes('saving') || q.includes('prevent')) {
    const savings = mockClaims.filter(c => c.flagged).reduce((s, c) => s + Math.max(0, c.claimAmount - c.expectedAmount), 0);
    return `💰 By preventing flagged fraudulent claims, potential savings estimate is **₹${(savings / 100000).toFixed(1)} Lakhs**. This includes upcoding overcharges, ghost billing, and duplicate claims.`;
  }

  if (q.includes('help') || q.includes('what can you')) {
    return `🤖 I'm the **AB Fraud Detection Assistant**. I can help you with:\n\n• **Claim statistics** — "How many claims are flagged?"\n• **Hospital analysis** — "Which hospital has highest risk?"\n• **Fraud types** — "Tell me about upcoding"\n• **State analysis** — "Which state has most fraud?"\n• **Savings** — "How much can we save?"\n• **Ghost billing** — "Show ghost billing data"`;
  }

  if (q.includes('report') || q.includes('summary')) {
    const total = mockClaims.length;
    const flagged = mockClaims.filter(c => c.flagged).length;
    const totalAmt = mockClaims.reduce((s, c) => s + c.claimAmount, 0);
    return `📋 **Fraud Detection Summary Report**\n\n• Total Claims Analyzed: **${total}**\n• Flagged Claims: **${flagged}** (${((flagged/total)*100).toFixed(1)}%)\n• Total Claims Value: **₹${(totalAmt/10000000).toFixed(2)} Crore**\n• Top Fraud Type: **Upcoding (32%)**\n• Critical Risk Claims: **${mockClaims.filter(c => c.riskLevel === 'critical').length}**\n• Recommended Actions: ${flagged} claims need review`;
  }

  return `🤖 I can analyze fraud patterns in the Ayushman Bharat claims data. Try asking me about:\n- Total claims and flagged statistics\n- Hospital risk analysis\n- Specific fraud types (upcoding, ghost billing)\n- State-wise analysis\n- Potential savings\n- Summary report`;
};

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '🛡️ Welcome to the **AB Fraud Detection Agent**. I can analyze claim patterns, identify fraud types, and generate risk insights. How can I help you?' },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate thinking
    await new Promise(r => setTimeout(r, 800 + Math.random() * 700));

    const response = getAIResponse(userMsg.content);
    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setIsTyping(false);
  };

  const quickActions = [
    'Summary report',
    'Highest risk hospital',
    'Upcoding analysis',
    'What can you do?',
  ];

  return (
    <>
      {/* Chat Toggle */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-primary text-primary-foreground shadow-lg glow-primary hover:scale-105 transition-transform"
          >
            <MessageSquare className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-96 h-[550px] glass-card flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Fraud Detection Agent</p>
                  <p className="text-[10px] text-success flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-glow" />
                    Online
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-secondary text-foreground rounded-bl-sm'
                  }`}>
                    {msg.content.split('\n').map((line, j) => (
                      <p key={j} className={j > 0 ? 'mt-1' : ''}>
                        {line.split(/(\*\*.*?\*\*)/).map((part, k) =>
                          part.startsWith('**') && part.endsWith('**')
                            ? <strong key={k} className="font-semibold">{part.slice(2, -2)}</strong>
                            : part
                        )}
                      </p>
                    ))}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
              {isTyping && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="bg-secondary px-3 py-2 rounded-xl rounded-bl-sm">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              {messages.length <= 1 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {quickActions.map(action => (
                    <button
                      key={action}
                      onClick={() => { setInput(action); }}
                      className="px-2.5 py-1 text-[10px] rounded-full bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-primary/10 border border-border transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about fraud patterns..."
                  className="flex-1 px-3 py-2 text-xs rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;
