'use client'

/**
 * Skeleton Loading Components
 * Provides visual feedback during data loading
 * 
 * Usage:
 * <SkeletonCard /> - Single card skeleton
 * <SkeletonStat /> - Stat card skeleton
 * <SkeletonTable rows={5} /> - Table skeleton
 * <SkeletonAgenda /> - Agenda card skeleton
 */

// Base Skeleton element with shimmer animation
function SkeletonBase({ className, style, ...props }) {
  return (
    <div
      className={`skeleton ${className || ''}`}
      style={{
        background: 'linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.5s infinite',
        borderRadius: 'var(--radius)',
        ...style
      }}
      aria-hidden="true"
      {...props}
    />
  )
}

// Skeleton for Stat Cards
export function SkeletonStat() {
  return (
    <div className="card" style={{ borderLeft: '4px solid var(--surface-3)' }}>
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <SkeletonBase style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius)' }} />
        </div>
        <SkeletonBase style={{ width: '40%', height: '0.75rem', marginBottom: '0.5rem' }} />
        <SkeletonBase style={{ width: '60%', height: '1.5rem' }} />
      </div>
    </div>
  )
}

// Grid of stat skeletons
export function SkeletonStatGrid({ count = 4 }) {
  return (
    <div className="stats-grid mb-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStat key={i} />
      ))}
    </div>
  )
}

// Skeleton for regular cards
export function SkeletonCard() {
  return (
    <div className="card">
      <div className="card-body">
        <div style={{ display: 'flex', gap: '1rem' }}>
          <SkeletonBase style={{ width: '60px', height: '60px', borderRadius: 'var(--radius)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <SkeletonBase style={{ width: '80px', height: '1.5rem', borderRadius: '9999px' }} />
              <SkeletonBase style={{ width: '60px', height: '1.5rem', borderRadius: '9999px' }} />
            </div>
            <SkeletonBase style={{ width: '90%', height: '1rem', marginBottom: '0.5rem' }} />
            <SkeletonBase style={{ width: '70%', height: '0.875rem' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// List of card skeletons
export function SkeletonCardList({ count = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

// Skeleton for table rows
export function SkeletonTableRow({ columns = 6 }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} style={{ padding: '0.75rem 1rem' }}>
          <SkeletonBase 
            style={{ 
              width: i === 0 ? '30px' : i === columns - 1 ? '60px' : '80%',
              height: '0.875rem'
            }} 
          />
        </td>
      ))}
    </tr>
  )
}

// Skeleton for entire table
export function SkeletonTable({ rows = 5, columns = 6 }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} style={{ padding: '0.75rem 1rem' }}>
                <SkeletonBase style={{ width: '70%', height: '0.6875rem' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Skeleton for agenda cards (specific to agenda page)
export function SkeletonAgendaCard() {
  return (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <div className="card-body">
        <div style={{ display: 'flex', gap: '1rem' }}>
          <SkeletonBase 
            style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: 'var(--radius)',
              flexShrink: 0
            }} 
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <SkeletonBase style={{ width: '90px', height: '1.25rem', borderRadius: '9999px' }} />
                <SkeletonBase style={{ width: '70px', height: '1.25rem', borderRadius: '9999px' }} />
              </div>
              <SkeletonBase style={{ width: '30px', height: '30px', borderRadius: 'var(--radius)' }} />
            </div>
            <SkeletonBase style={{ width: '100%', height: '1rem', marginBottom: '0.5rem' }} />
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <SkeletonBase style={{ width: '100px', height: '0.8125rem' }} />
              <SkeletonBase style={{ width: '120px', height: '0.8125rem' }} />
              <SkeletonBase style={{ width: '90px', height: '0.8125rem' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Skeleton for program cards
export function SkeletonProgramCard() {
  return (
    <div className="program-card" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          <SkeletonBase style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <SkeletonBase style={{ width: '80%', height: '0.875rem', marginBottom: '0.25rem' }} />
            <SkeletonBase style={{ width: '40%', height: '0.6875rem' }} />
          </div>
        </div>
        <SkeletonBase style={{ width: '50px', height: '1.25rem', borderRadius: '9999px' }} />
      </div>
      <SkeletonBase style={{ width: '100%', height: '0.5rem', borderRadius: '9999px', marginBottom: '0.5rem' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <SkeletonBase style={{ width: '80px', height: '0.75rem' }} />
        <SkeletonBase style={{ width: '100px', height: '0.75rem' }} />
      </div>
    </div>
  )
}

// Full page loading state for dashboard
export function SkeletonDashboard() {
  return (
    <div className="dashboard-page">
      {/* Welcome Section Skeleton */}
      <div className="card mb-6" style={{ background: 'var(--surface-2)' }}>
        <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <SkeletonBase style={{ width: '60%', height: '1.5rem', marginBottom: '0.5rem' }} />
            <SkeletonBase style={{ width: '40%', height: '0.9375rem' }} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <SkeletonBase style={{ width: '120px', height: '0.8125rem', marginBottom: '0.25rem' }} />
            <SkeletonBase style={{ width: '150px', height: '1.125rem' }} />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <SkeletonStatGrid count={4} />

      {/* Quick Actions */}
      <div style={{ marginBottom: '1.5rem' }}>
        <SkeletonBase style={{ width: '100px', height: '1rem', marginBottom: '1rem' }} />
        <div className="quick-actions-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <SkeletonBase style={{ width: '3rem', height: '3rem', borderRadius: '50%', margin: '0 auto 0.75rem' }} />
              <SkeletonBase style={{ width: '80%', height: '0.8125rem', margin: '0 auto' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div>
          <div className="card mb-4">
            <div className="card-header">
              <SkeletonBase style={{ width: '200px', height: '1rem' }} />
            </div>
            <div className="card-body">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonProgramCard key={i} />
              ))}
            </div>
          </div>
        </div>
        <div>
          <div className="card mb-4">
            <div className="card-header">
              <SkeletonBase style={{ width: '150px', height: '1rem' }} />
            </div>
            <div className="card-body">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <SkeletonBase style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <SkeletonBase style={{ width: '70%', height: '0.8125rem' }} />
                      <SkeletonBase style={{ width: '60px', height: '1.25rem', borderRadius: '9999px' }} />
                    </div>
                    <SkeletonBase style={{ width: '90%', height: '0.6875rem' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Add shimmer animation to global styles
export function SkeletonStyles() {
  return (
    <style jsx global>{`
      @keyframes skeleton-shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }
      
      .skeleton {
        display: inline-block;
      }
    `}</style>
  )
}
