import React from 'react';
import { render, screen, waitFor } from '@/__tests__/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { SearchBar, type Filter } from '@/components/ui/search-bar';
import { Search, Star, TrendingUp } from 'lucide-react';

const mockFilters: Filter[] = [
  { id: 'productivity', label: 'Productivity', count: 25, icon: <Star className="h-4 w-4" /> },
  { id: 'development', label: 'Development', count: 18, icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'featured', label: 'Featured', count: 5 },
];

const mockSuggestions = [
  'productivity automation',
  'data analysis tools', 
  'content writing assistant',
  'development utilities',
];

const mockRecentSearches = [
  'ai agents',
  'task automation',
  'data processing',
];

describe('SearchBar Component', () => {
  it('renders with default props', () => {
    render(<SearchBar />);
    
    const input = screen.getByPlaceholderText(/search agents/i);
    expect(input).toBeInTheDocument();
    expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
  });

  it('handles input value changes', async () => {
    const handleChange = jest.fn();
    const user = userEvent.setup();
    
    render(<SearchBar onChange={handleChange} />);
    
    const input = screen.getByPlaceholderText(/search agents/i);
    await user.type(input, 'test query');
    
    expect(handleChange).toHaveBeenCalledWith('test query');
    expect(input).toHaveValue('test query');
  });

  it('handles form submission', async () => {
    const handleSubmit = jest.fn();
    const user = userEvent.setup();
    
    render(<SearchBar onSubmit={handleSubmit} />);
    
    const input = screen.getByPlaceholderText(/search agents/i);
    await user.type(input, 'search term');
    await user.keyboard('{Enter}');
    
    expect(handleSubmit).toHaveBeenCalledWith('search term');
  });

  it('shows and hides suggestions on focus/blur', async () => {
    const user = userEvent.setup();
    
    render(
      <SearchBar 
        suggestions={mockSuggestions}
        showRecentSearches={false}
      />
    );
    
    const input = screen.getByPlaceholderText(/search agents/i);
    
    // Type to trigger suggestions
    await user.type(input, 'prod');
    
    await waitFor(() => {
      expect(screen.getByText('Suggestions')).toBeInTheDocument();
      mockSuggestions.forEach(suggestion => {
        expect(screen.getByText(suggestion)).toBeInTheDocument();
      });
    });
    
    // Blur to hide suggestions
    await user.click(document.body);
    
    await waitFor(() => {
      expect(screen.queryByText('Suggestions')).not.toBeInTheDocument();
    });
  });

  it('shows recent searches when focused with empty input', async () => {
    const user = userEvent.setup();
    
    render(
      <SearchBar 
        recentSearches={mockRecentSearches}
        showRecentSearches={true}
      />
    );
    
    const input = screen.getByPlaceholderText(/search agents/i);
    await user.click(input);
    
    await waitFor(() => {
      expect(screen.getByText('Recent searches')).toBeInTheDocument();
      mockRecentSearches.forEach(search => {
        expect(screen.getByText(search)).toBeInTheDocument();
      });
    });
  });

  it('handles suggestion clicks', async () => {
    const handleSubmit = jest.fn();
    const handleChange = jest.fn();
    const user = userEvent.setup();
    
    render(
      <SearchBar 
        suggestions={mockSuggestions}
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
    );
    
    const input = screen.getByPlaceholderText(/search agents/i);
    await user.type(input, 'prod');
    
    await waitFor(() => {
      expect(screen.getByText(mockSuggestions[0])).toBeInTheDocument();
    });
    
    await user.click(screen.getByText(mockSuggestions[0]));
    
    expect(handleChange).toHaveBeenCalledWith(mockSuggestions[0]);
    expect(handleSubmit).toHaveBeenCalledWith(mockSuggestions[0]);
    expect(input).toHaveValue(mockSuggestions[0]);
  });

  it('clears input when clear button is clicked', async () => {
    const handleChange = jest.fn();
    const user = userEvent.setup();
    
    render(<SearchBar onChange={handleChange} />);
    
    const input = screen.getByPlaceholderText(/search agents/i);
    await user.type(input, 'test');
    
    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);
    
    expect(input).toHaveValue('');
    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('shows and manages filters', async () => {
    const handleFilterChange = jest.fn();
    const user = userEvent.setup();
    
    render(
      <SearchBar 
        filters={mockFilters}
        activeFilters={[]}
        onFilterChange={handleFilterChange}
      />
    );
    
    // Open filters
    const filtersButton = screen.getByRole('button', { name: /filters/i });
    await user.click(filtersButton);
    
    await waitFor(() => {
      mockFilters.forEach(filter => {
        expect(screen.getByText(filter.label)).toBeInTheDocument();
        if (filter.count) {
          expect(screen.getByText(filter.count.toString())).toBeInTheDocument();
        }
      });
    });
    
    // Click a filter
    await user.click(screen.getByText('Productivity'));
    expect(handleFilterChange).toHaveBeenCalledWith(['productivity']);
  });

  it('displays active filters as badges', async () => {
    const handleFilterChange = jest.fn();
    const user = userEvent.setup();
    
    render(
      <SearchBar 
        filters={mockFilters}
        activeFilters={['productivity', 'development']}
        onFilterChange={handleFilterChange}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Productivity')).toBeInTheDocument();
      expect(screen.getByText('Development')).toBeInTheDocument();
    });
    
    // Remove a filter by clicking the badge
    const productivityBadge = screen.getByText('Productivity').closest('div');
    await user.click(productivityBadge!);
    
    expect(handleFilterChange).toHaveBeenCalledWith(['development']);
  });

  it('toggles filter dropdown visibility', async () => {
    const user = userEvent.setup();
    
    render(<SearchBar filters={mockFilters} />);
    
    const filtersButton = screen.getByRole('button', { name: /filters/i });
    
    // Initially closed
    expect(screen.queryByText('Productivity')).not.toBeInTheDocument();
    
    // Open
    await user.click(filtersButton);
    await waitFor(() => {
      expect(screen.getByText('Productivity')).toBeInTheDocument();
    });
    
    // Close
    await user.click(filtersButton);
    await waitFor(() => {
      expect(screen.queryByText('Productivity')).not.toBeInTheDocument();
    });
  });

  it('shows keyboard shortcut hint', () => {
    render(<SearchBar />);
    
    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('supports controlled value prop', () => {
    const { rerender } = render(<SearchBar value="initial value" />);
    
    const input = screen.getByPlaceholderText(/search agents/i);
    expect(input).toHaveValue('initial value');
    
    rerender(<SearchBar value="updated value" />);
    expect(input).toHaveValue('updated value');
  });

  it('handles custom placeholder', () => {
    render(<SearchBar placeholder="Custom placeholder text" />);
    
    expect(screen.getByPlaceholderText('Custom placeholder text')).toBeInTheDocument();
  });

  it('shows no suggestions message when no results', async () => {
    const user = userEvent.setup();
    
    render(<SearchBar suggestions={[]} />);
    
    const input = screen.getByPlaceholderText(/search agents/i);
    await user.type(input, 'nonexistent');
    
    await waitFor(() => {
      expect(screen.getByText('No suggestions found')).toBeInTheDocument();
    });
  });

  it('limits displayed suggestions to 8 items', async () => {
    const manySuggestions = Array.from({ length: 15 }, (_, i) => `suggestion ${i + 1}`);
    const user = userEvent.setup();
    
    render(<SearchBar suggestions={manySuggestions} />);
    
    const input = screen.getByPlaceholderText(/search agents/i);
    await user.type(input, 'sug');
    
    await waitFor(() => {
      // Should only show first 8 suggestions
      for (let i = 1; i <= 8; i++) {
        expect(screen.getByText(`suggestion ${i}`)).toBeInTheDocument();
      }
      expect(screen.queryByText('suggestion 9')).not.toBeInTheDocument();
    });
  });

  it('limits displayed recent searches to 5 items', async () => {
    const manyRecentSearches = Array.from({ length: 10 }, (_, i) => `recent ${i + 1}`);
    const user = userEvent.setup();
    
    render(
      <SearchBar 
        recentSearches={manyRecentSearches}
        showRecentSearches={true}
      />
    );
    
    const input = screen.getByPlaceholderText(/search agents/i);
    await user.click(input);
    
    await waitFor(() => {
      // Should only show first 5 recent searches
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByText(`recent ${i}`)).toBeInTheDocument();
      }
      expect(screen.queryByText('recent 6')).not.toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    render(<SearchBar className="custom-search-class" />);
    
    const searchContainer = screen.getByPlaceholderText(/search agents/i).closest('.custom-search-class');
    expect(searchContainer).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    
    render(<SearchBar ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  describe('Keyboard Navigation', () => {
    it('handles Enter key submission', async () => {
      const handleSubmit = jest.fn();
      const user = userEvent.setup();
      
      render(<SearchBar onSubmit={handleSubmit} />);
      
      const input = screen.getByPlaceholderText(/search agents/i);
      await user.type(input, 'test');
      await user.keyboard('{Enter}');
      
      expect(handleSubmit).toHaveBeenCalledWith('test');
    });

    it('focuses input when clicking container', async () => {
      const user = userEvent.setup();
      
      render(<SearchBar />);
      
      const input = screen.getByPlaceholderText(/search agents/i);
      const searchIcon = screen.getByLabelText(/search/i);
      
      await user.click(searchIcon);
      expect(input).toHaveFocus();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<SearchBar />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      
      const searchForm = screen.getByRole('form');
      expect(searchForm).toBeInTheDocument();
    });

    it('supports screen readers for filter counts', async () => {
      const user = userEvent.setup();
      
      render(<SearchBar filters={mockFilters} />);
      
      const filtersButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filtersButton);
      
      await waitFor(() => {
        mockFilters.forEach(filter => {
          if (filter.count) {
            expect(screen.getByText(filter.count.toString())).toBeInTheDocument();
          }
        });
      });
    });
  });

  describe('Visual States', () => {
    it('shows focus state styling', async () => {
      const user = userEvent.setup();
      
      render(<SearchBar />);
      
      const input = screen.getByPlaceholderText(/search agents/i);
      await user.click(input);
      
      const container = input.closest('.focus-within\\:border-terminal-green\\/50');
      expect(container).toBeInTheDocument();
    });

    it('shows active filter styling', async () => {
      const user = userEvent.setup();
      
      render(
        <SearchBar 
          filters={mockFilters}
          activeFilters={['productivity']}
        />
      );
      
      const filtersButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filtersButton);
      
      await waitFor(() => {
        const activeFilterButton = screen.getByRole('button', { name: /productivity/i });
        expect(activeFilterButton).toHaveClass('bg-terminal-green');
      });
    });
  });
});