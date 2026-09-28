import { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useLocation } from 'react-router-dom';

export default function UserTour() {
  const [run, setRun] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Only run the tour if it hasn't been completed before and we're on the home page
    const hasCompletedTour = localStorage.getItem('vibetogether_tour_completed');
    if (!hasCompletedTour && location.pathname === '/') {
      // Small delay to let the app finish rendering and animating
      const timer = setTimeout(() => {
        setRun(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem('vibetogether_tour_completed', 'true');
    }
  };

  const steps = [
    {
      target: 'body',
      content: (
        <div>
          <h3 className="text-xl font-bold mb-2 text-purple-400">Welcome to VibeTogether! 👋</h3>
          <p className="text-gray-300">Let's take a quick tour to show you around your new real-time music sharing space.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.tour-sidebar-nav',
      content: (
        <div>
          <h3 className="font-bold text-lg mb-1">Navigation</h3>
          <p className="text-sm">Quickly jump between your Home, Chats, Music Library, and Friends list from here.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '.tour-party-mode',
      content: (
        <div>
          <h3 className="font-bold text-lg text-purple-400 mb-1">Party Mode 🎉</h3>
          <p className="text-sm">Click this button on any friend's card to instantly start a synchronized listening party using high-quality audio streaming!</p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '.tour-search-bar',
      content: (
        <div>
          <h3 className="font-bold text-lg mb-1">Global Search</h3>
          <p className="text-sm">Find your favorite artists, trending songs, or discover new friends to vibe with.</p>
        </div>
      ),
      placement: 'bottom',
    }
  ];

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      scrollToFirstStep={true}
      showProgress={true}
      showSkipButton={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          arrowColor: '#1a1625',
          backgroundColor: '#1a1625',
          overlayColor: 'rgba(0, 0, 0, 0.7)',
          primaryColor: '#9333ea', // purple-600
          textColor: '#ffffff',
          width: 400,
          zIndex: 10000,
        },
        tooltipContainer: {
          textAlign: 'left',
          borderRadius: '16px',
        },
        buttonNext: {
          borderRadius: '9999px',
          fontWeight: 600,
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#a855f7', // purple-400
        },
        buttonSkip: {
          color: '#9ca3af', // gray-400
        }
      }}
    />
  );
}
