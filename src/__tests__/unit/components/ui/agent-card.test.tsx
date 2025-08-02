import React from 'react';
import { render, screen, waitFor } from '@/__tests__/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { AgentCard, type AgentCardProps } from '@/components/ui/agent-card';

const mockAgentProps: AgentCardProps = {
  id: 'test-agent-1',
  title: 'Test Productivity Agent',
  description: 'A comprehensive agent for productivity tasks including task management, note taking, and scheduling.',
  author: 'testuser',
  category: 'productivity',
  tags: ['automation', 'productivity', 'tasks', 'scheduling', 'notes'],
  rating: 4.8,
  downloads: 1250,
  views: 5600,
  forks: 23,
  lastUpdated: '2 days ago',
  codePreview: `function createTask(title: string, priority: 'high' | 'medium' | 'low') {
  return {
    id: generateId(),
    title,
    priority,
    completed: false,
    createdAt: new Date()
  };
}`,
};

describe('AgentCard Component', () => {
  it('renders with all required props', () => {
    render(<AgentCard {...mockAgentProps} />);
    
    expect(screen.getByText('Test Productivity Agent')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('productivity')).toBeInTheDocument();
    expect(screen.getByText(/comprehensive agent for productivity/i)).toBeInTheDocument();
  });

  it('displays rating with star icon', () => {
    render(<AgentCard {...mockAgentProps} />);
    
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('Rating')).toBeInTheDocument();
  });

  it('formats download count correctly', () => {
    const { rerender } = render(<AgentCard {...mockAgentProps} downloads={500} />);
    expect(screen.getByText('500')).toBeInTheDocument();
    
    rerender(<AgentCard {...mockAgentProps} downloads={1500} />);
    expect(screen.getByText('1.5k')).toBeInTheDocument();
    
    rerender(<AgentCard {...mockAgentProps} downloads={50000} />);
    expect(screen.getByText('50.0k')).toBeInTheDocument();
  });

  it('formats view count correctly', () => {
    const { rerender } = render(<AgentCard {...mockAgentProps} views={800} />);
    expect(screen.getByText('800')).toBeInTheDocument();
    
    rerender(<AgentCard {...mockAgentProps} views={2500} />);
    expect(screen.getByText('2.5k')).toBeInTheDocument();
  });

  it('displays tags with limit of 3 visible', () => {
    render(<AgentCard {...mockAgentProps} />);
    
    // Should show first 3 tags
    expect(screen.getByText('automation')).toBeInTheDocument();
    expect(screen.getByText('productivity')).toBeInTheDocument();
    expect(screen.getByText('tasks')).toBeInTheDocument();
    
    // Should show +2 for remaining tags
    expect(screen.getByText('+2')).toBeInTheDocument();
    
    // Should not show remaining tags directly
    expect(screen.queryByText('scheduling')).not.toBeInTheDocument();
    expect(screen.queryByText('notes')).not.toBeInTheDocument();
  });

  it('handles fewer than 3 tags correctly', () => {
    render(<AgentCard {...mockAgentProps} tags={['tag1', 'tag2']} />);
    
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it('shows verified badge when verified is true', () => {
    render(<AgentCard {...mockAgentProps} verified={true} />);
    
    expect(screen.getByText('VERIFIED')).toBeInTheDocument();
  });

  it('does not show verified badge when verified is false', () => {
    render(<AgentCard {...mockAgentProps} verified={false} />);
    
    expect(screen.queryByText('VERIFIED')).not.toBeInTheDocument();
  });

  it('shows featured badge and styling when featured is true', () => {
    render(<AgentCard {...mockAgentProps} featured={true} />);
    
    expect(screen.getByText('FEATURED')).toBeInTheDocument();
    
    const card = screen.getByText('Test Productivity Agent').closest('div');
    expect(card).toHaveClass('border-terminal-green/30');
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(<AgentCard {...mockAgentProps} onClick={handleClick} />);
    
    const card = screen.getByText('Test Productivity Agent').closest('div');
    await user.click(card!);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows code preview on hover', async () => {
    const user = userEvent.setup();
    
    render(<AgentCard {...mockAgentProps} />);
    
    const card = screen.getByText('Test Productivity Agent').closest('div');
    
    // Initially shows truncated code
    expect(screen.getByText(/function createTask/)).toBeInTheDocument();
    expect(screen.getByText('...')).toBeInTheDocument();
    
    // Hover to show full code
    await user.hover(card!);
    
    await waitFor(() => {
      expect(screen.getByText(/createdAt: new Date/)).toBeInTheDocument();
      expect(screen.queryByText('...')).not.toBeInTheDocument();
    });
  });

  it('shows View Details button on hover', async () => {
    const user = userEvent.setup();
    
    render(<AgentCard {...mockAgentProps} />);
    
    const card = screen.getByText('Test Productivity Agent').closest('div');
    
    // Button should not be visible initially
    expect(screen.queryByText('View Details')).not.toBeInTheDocument();
    
    // Hover to show button
    await user.hover(card!);
    
    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });
  });

  it('hides hover effects when mouse leaves', async () => {
    const user = userEvent.setup();
    
    render(<AgentCard {...mockAgentProps} />);
    
    const card = screen.getByText('Test Productivity Agent').closest('div');
    
    // Hover to trigger effects
    await user.hover(card!);
    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });
    
    // Unhover to hide effects
    await user.unhover(card!);
    await waitFor(() => {
      expect(screen.queryByText('View Details')).not.toBeInTheDocument();
    });
  });

  it('renders without code preview', () => {
    render(<AgentCard {...mockAgentProps} codePreview={undefined} />);
    
    expect(screen.queryByText(/function createTask/)).not.toBeInTheDocument();
  });

  it('displays last updated time', () => {
    render(<AgentCard {...mockAgentProps} />);
    
    expect(screen.getByText('Updated 2 days ago')).toBeInTheDocument();
  });

  it('displays all stats correctly', () => {
    render(<AgentCard {...mockAgentProps} />);
    
    // Check stats labels
    expect(screen.getByText('Rating')).toBeInTheDocument();
    expect(screen.getByText('Downloads')).toBeInTheDocument();
    expect(screen.getByText('Views')).toBeInTheDocument();
    expect(screen.getByText('Forks')).toBeInTheDocument();
    
    // Check stats values
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('1.3k')).toBeInTheDocument(); // 1250 -> 1.3k
    expect(screen.getByText('5.6k')).toBeInTheDocument(); // 5600 -> 5.6k
    expect(screen.getByText('23')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<AgentCard {...mockAgentProps} className="custom-agent-card" />);
    
    const card = screen.getByText('Test Productivity Agent').closest('div');
    expect(card).toHaveClass('custom-agent-card');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    
    render(<AgentCard {...mockAgentProps} ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      render(<AgentCard {...mockAgentProps} />);
      
      // Title should be a heading
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveTextContent('Test Productivity Agent');
    });

    it('supports keyboard navigation when clickable', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<AgentCard {...mockAgentProps} onClick={handleClick} />);
      
      const card = screen.getByText('Test Productivity Agent').closest('div');
      
      // Should be focusable when clickable
      await user.tab();
      expect(card).toHaveFocus();
      
      // Should trigger click on Enter/Space
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Visual States', () => {
    it('applies hover styles correctly', async () => {
      const user = userEvent.setup();
      
      render(<AgentCard {...mockAgentProps} />);
      
      const card = screen.getByText('Test Productivity Agent').closest('div');
      const title = screen.getByText('Test Productivity Agent');
      
      // Hover to apply styles
      await user.hover(card!);
      
      await waitFor(() => {
        expect(title).toHaveClass('group-hover:text-terminal-green');
      });
    });

    it('shows glow effect on hover', async () => {
      const user = userEvent.setup();
      
      render(<AgentCard {...mockAgentProps} />);
      
      const card = screen.getByText('Test Productivity Agent').closest('div');
      
      await user.hover(card!);
      
      // The glow effect should be present (motion div with specific classes)
      await waitFor(() => {
        const glowEffect = card!.querySelector('.absolute.inset-0.rounded-lg.border.border-terminal-green\\/20');
        expect(glowEffect).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles zero stats gracefully', () => {
      render(
        <AgentCard 
          {...mockAgentProps} 
          rating={0}
          downloads={0}
          views={0}
          forks={0}
        />
      );
      
      expect(screen.getByText('0.0')).toBeInTheDocument(); // rating
      expect(screen.getAllByText('0')).toHaveLength(3); // downloads, views, forks
    });

    it('handles very long descriptions', () => {
      const longDescription = 'This is a very long description that should be truncated properly when displayed in the card component to ensure good user experience and layout consistency.';
      
      render(<AgentCard {...mockAgentProps} description={longDescription} />);
      
      const description = screen.getByText(longDescription);
      expect(description).toHaveClass('line-clamp-2');
    });

    it('handles empty tags array', () => {
      render(<AgentCard {...mockAgentProps} tags={[]} />);
      
      // Should not crash and should not show any tag-related elements
      expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
    });

    it('handles very large numbers in stats', () => {
      render(
        <AgentCard 
          {...mockAgentProps} 
          downloads={1500000}
          views={2500000}
        />
      );
      
      expect(screen.getByText('1500.0k')).toBeInTheDocument();
      expect(screen.getByText('2500.0k')).toBeInTheDocument();
    });
  });
});