import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Mock dependencies
vi.mock('axios');
vi.mock('react-chartjs-2', () => ({
  Line: () => null,
  Pie: () => null,
}));
vi.mock('chart.js', () => ({
  Chart: { register: vi.fn(), defaults: { color: '', borderColor: '' } },
  CategoryScale: {}, LinearScale: {}, PointElement: {}, LineElement: {}, Title: {}, Tooltip: {}, Legend: {}, ArcElement: {}
}));

describe('App Component', () => {
  it('should render login screen initially', () => {
    render(<App />);
    expect(screen.getByText(/Witaj ponownie/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Adres Email/i)).toBeInTheDocument();
  });

  it('should switch to dashboard when Demo Mode is clicked', async () => {
    render(<App />);
    
    const demoButton = screen.getByText(/Tryb Demo/i);
    fireEvent.click(demoButton);

    await waitFor(() => {
        expect(screen.getByText(/System Online/i)).toBeInTheDocument();
        expect(screen.getByText(/Twój Portfel/i)).toBeInTheDocument();
        const amounts = screen.getAllByText(/12500.00/i);
        expect(amounts.length).toBeGreaterThan(0);
    });
  });
});
