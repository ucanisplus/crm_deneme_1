// GalvanizliSecimPopup.jsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const GalvanizliSecimPopup = ({ 
  isOpen, 
  onClose, 
  onSelect,
  title = "Galvanizli Tel Seçimi",
  description = "Panel hesaplamalarında hangi tel tipi kullanılsın?"
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <button
            onClick={() => onSelect(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow transition-colors"
          >
            Galvanizli Tel
          </button>
          <button
            onClick={() => onSelect(false)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-md shadow transition-colors"
          >
            Galvanizsiz Tel
          </button>
        </div>
        <DialogFooter>
          <button
            onClick={() => onClose()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow transition-colors"
          >
            İptal
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GalvanizliSecimPopup;