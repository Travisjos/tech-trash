import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, CreditCard, ChevronRight, Loader2 } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Bin } from '../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  bin: Bin;
}

export default function PaymentModal({ isOpen, onClose, phone, bin }: PaymentModalProps) {
  const [amount, setAmount] = useState(String(Math.max(0, bin.subscriptionFee - bin.amountPaid)));
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    setIsProcessing(true);

    try {
      // Create payment log
      const paymentRef = await addDoc(collection(db, 'payments'), {
        binId: bin.id,
        userId: auth.currentUser?.uid,
        amount: Number(amount),
        phoneNumber: phone,
        status: 'completed', // Mocking success for demo
        timestamp: serverTimestamp(),
      });

      // Update bin record
      const binRef = doc(db, 'bins', bin.id);
      const newAmountPaid = bin.amountPaid + Number(amount);
      const subscriptionActive = newAmountPaid >= bin.subscriptionFee;

      await updateDoc(binRef, {
        amountPaid: newAmountPaid,
        subscriptionActive,
        paymentDate: subscriptionActive ? new Date().toISOString() : bin.paymentDate,
        lastUpdated: new Date().toISOString(),
      });

      onClose();
    } catch (error) {
      console.error("Payment error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#2c3e50]/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[40px] p-10 overflow-hidden shadow-2xl border border-black/5"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/20 rounded-3xl flex items-center justify-center border border-primary/10 shadow-inner">
                  <CreditCard className="text-primary w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-dark tracking-tight font-serif italic">Process Settlement</h2>
                  <p className="text-[10px] uppercase font-black tracking-widest text-[#95a5a6] mt-0.5">Secure Municipal Endpoint</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2.5 hover:bg-gray-100 rounded-full text-[#95a5a6] transition-colors"
                id="close-payment-modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#95a5a6]">Funding Source</span>
                  <Phone size={12} className="text-primary" />
                </div>
                <p className="text-xl font-mono font-bold text-dark">{phone}</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#95a5a6]">Settlement Required (UGX)</span>
                  <span className="text-[9px] font-bold text-dark/40 uppercase tracking-tighter">NODE: {bin.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent text-3xl font-mono font-bold text-dark focus:outline-none placeholder-gray-300"
                  placeholder="0.00"
                  id="payment-amount-input"
                />
              </div>

              <div className="flex items-center gap-2 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Network check: Nominal. USSD trigger ready.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-10 flex gap-4">
              <button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="w-full py-5 rounded-3xl bg-dark text-white font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-4 shadow-xl shadow-dark/10 text-[10px] uppercase tracking-[0.2em]"
                id="confirm-payment-btn"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Authorize Settlement <ChevronRight size={18} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
