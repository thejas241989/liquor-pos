import React from 'react';
import { X, CheckCircle, Receipt } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';

interface SaleCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleData: {
    itemCount: number;
    total: number;
    subtotal: number;
    tax: number;
    items: Array<{
      name: string;
      quantity: number;
      subtotal: number;
    }>;
  };
}

const SaleCompleteModal: React.FC<SaleCompleteModalProps> = ({ isOpen, onClose, saleData }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Sale Completed</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-center">
              <p className="text-green-800 font-medium">Transaction Successful</p>
              <p className="text-green-600 text-sm">{saleData.itemCount} items sold</p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-gray-900">Items Sold:</h3>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {saleData.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrency(saleData.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax (10%):</span>
              <span>{formatCurrency(saleData.tax)}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg border-t pt-1">
              <span>Total:</span>
              <span className="text-green-600">{formatCurrency(saleData.total)}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={onClose}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaleCompleteModal;
