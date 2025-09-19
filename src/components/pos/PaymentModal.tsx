import React, { useState, useEffect } from 'react';
import { X, CreditCard, Smartphone, Banknote, Calculator, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (paymentData: PaymentData) => void;
  totalAmount: number;
}

interface PaymentData {
  payment_method: 'cash' | 'upi' | 'credit';
  cash_received?: number;
  change_returned?: number;
  upi_reference?: string;
  credit_customer?: string;
  credit_due_date?: Date;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  totalAmount
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'upi' | 'credit'>('cash');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [upiReference, setUpiReference] = useState<string>('');
  const [creditCustomer, setCreditCustomer] = useState<string>('');
  const [creditDueDate, setCreditDueDate] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const changeAmount = Math.max(0, cashReceived - totalAmount);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setSelectedMethod('cash');
      setCashReceived(0);
      setUpiReference('');
      setCreditCustomer('');
      setCreditDueDate('');
      setIsProcessing(false);
      
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      // Focus the modal container to prevent focus issues
      const modal = document.getElementById('payment-modal');
      if (modal) {
        modal.focus();
      }
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSubmit = async () => {
    setIsProcessing(true);

    try {
      const paymentData: PaymentData = {
        payment_method: selectedMethod,
      };

      switch (selectedMethod) {
        case 'cash':
          if (cashReceived < totalAmount) {
            alert('Cash received must be at least the total amount');
            setIsProcessing(false);
            return;
          }
          paymentData.cash_received = cashReceived;
          paymentData.change_returned = changeAmount;
          break;

        case 'upi':
          if (!upiReference.trim()) {
            alert('Please enter UPI reference');
            setIsProcessing(false);
            return;
          }
          paymentData.upi_reference = upiReference.trim();
          break;

        case 'credit':
          if (!creditCustomer.trim()) {
            alert('Please enter customer name for credit sale');
            setIsProcessing(false);
            return;
          }
          paymentData.credit_customer = creditCustomer.trim();
          if (creditDueDate) {
            paymentData.credit_due_date = new Date(creditDueDate);
          }
          break;
      }

      await onComplete(paymentData);
    } catch (error) {
      console.error('Payment processing error:', error);
      alert('Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isProcessing) {
      handleSubmit();
    }
  };

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isProcessing) {
      onClose();
    }
    
    // Focus trap - keep focus within modal
    if (e.key === 'Tab') {
      const modal = document.getElementById('payment-modal');
      if (modal) {
        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          onClose();
        }
      }}
    >
      <div 
        id="payment-modal"
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
        tabIndex={-1}
        onKeyDown={handleModalKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Payment Method</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isProcessing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Total Amount Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="text-center">
            <p className="text-blue-800 font-medium">Total Amount</p>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalAmount)}</p>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="space-y-3 mb-6">
          <h3 className="font-medium text-gray-900">Select Payment Method:</h3>
          
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setSelectedMethod('cash')}
              className={`p-3 rounded-lg border-2 transition-colors flex flex-col items-center gap-2 ${
                selectedMethod === 'cash'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Banknote className="w-6 h-6" />
              <span className="text-sm font-medium">Cash</span>
            </button>

            <button
              onClick={() => setSelectedMethod('upi')}
              className={`p-3 rounded-lg border-2 transition-colors flex flex-col items-center gap-2 ${
                selectedMethod === 'upi'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Smartphone className="w-6 h-6" />
              <span className="text-sm font-medium">UPI</span>
            </button>

            <button
              onClick={() => setSelectedMethod('credit')}
              className={`p-3 rounded-lg border-2 transition-colors flex flex-col items-center gap-2 ${
                selectedMethod === 'credit'
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CreditCard className="w-6 h-6" />
              <span className="text-sm font-medium">Credit</span>
            </button>
          </div>
        </div>

        {/* Payment Method Specific Fields */}
        {selectedMethod === 'cash' && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cash Received
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={cashReceived || ''}
                  onChange={(e) => setCashReceived(Number(e.target.value))}
                  onKeyPress={handleKeyPress}
                  onFocus={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                  min={totalAmount}
                  step="0.01"
                  autoFocus
                />
                <Calculator className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {cashReceived > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Change to Return:</span>
                  <span className={`text-lg font-bold ${changeAmount > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                    {formatCurrency(changeAmount)}
                  </span>
                </div>
                {cashReceived < totalAmount && (
                  <p className="text-red-600 text-xs mt-1">
                    Insufficient cash received
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {selectedMethod === 'upi' && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                UPI Reference/Transaction ID
              </label>
              <input
                type="text"
                value={upiReference}
                onChange={(e) => setUpiReference(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter UPI reference or transaction ID"
                autoFocus
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 text-sm">
                💡 Complete the UPI payment and enter the reference ID above
              </p>
            </div>
          </div>
        )}

        {selectedMethod === 'credit' && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name
              </label>
              <input
                type="text"
                value={creditCustomer}
                onChange={(e) => setCreditCustomer(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter customer name"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date (Optional)
              </label>
              <input
                type="date"
                value={creditDueDate}
                onChange={(e) => setCreditDueDate(e.target.value)}
                onFocus={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-orange-800 text-sm">
                ⚠️ Credit sales will be marked as pending payment
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isProcessing || (selectedMethod === 'cash' && cashReceived < totalAmount)}
            className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Complete Sale
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
