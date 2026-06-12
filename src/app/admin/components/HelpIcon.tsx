'use client';

import React, { useState } from 'react';

/**
 * A small "?" badge that reveals an explanatory popover on hover/click.
 *
 * Shared across the routing-related admin tabs (Smart Routing, Priority Rules,
 * Provider fallback) so each feature carries an inline description of what it
 * does and how it interacts with the others. `tooltip` is rendered with
 * `white-space: pre-wrap`, so multi-line strings keep their line breaks.
 */
export default function HelpIcon({ tooltip, align = 'center' }: { tooltip: string; align?: 'left' | 'center' | 'right' }) {
  const [show, setShow] = useState(false);

  const popoverPosition =
    align === 'left'
      ? { left: 0, transform: 'none' }
      : align === 'right'
        ? { right: 0, transform: 'none' }
        : { left: '50%', transform: 'translateX(-50%)' };

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow((v) => !v)}
        aria-label="Help"
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          border: '1px solid rgba(96, 165, 250, 0.3)',
          background: 'rgba(59, 130, 246, 0.1)',
          color: '#60a5fa',
          fontSize: '0.7rem',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          lineHeight: 1,
        }}
      >
        ?
      </button>

      {show && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            top: '100%',
            marginTop: '0.5rem',
            minWidth: '300px',
            maxWidth: '400px',
            padding: '1rem',
            borderRadius: '12px',
            background: 'rgba(17, 24, 39, 0.98)',
            border: '1px solid rgba(96, 165, 250, 0.3)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
            color: '#e5e7eb',
            fontSize: '0.85rem',
            lineHeight: 1.6,
            zIndex: 1000,
            whiteSpace: 'pre-wrap',
            textAlign: 'left',
            ...popoverPosition,
          }}
        >
          {tooltip}
        </div>
      )}
    </span>
  );
}
