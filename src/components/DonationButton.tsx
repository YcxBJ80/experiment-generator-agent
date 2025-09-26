import { Heart } from 'lucide-react';

interface DonationButtonProps {
  className?: string;
}

export default function DonationButton({ className = '' }: DonationButtonProps) {
  const handleDonationClick = () => {
    window.open('https://yangchengxuan.vercel.app/donate', '_blank');
  };

  return (
    <button
      onClick={handleDonationClick}
      className={`fixed bottom-8 right-8 z-30 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${className}`}
      title="Support the project"
    >
      <Heart className="w-5 h-5" />
      <span className="font-medium">Donation</span>
    </button>
  );
}