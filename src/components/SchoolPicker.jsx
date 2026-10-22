// Find a school: a filter box over a list, in a dropdown on desktop and a
// bottom sheet on a phone. Both pages' "find" icons open one.
import { useMemo, useState } from 'react';
import * as DM from '@radix-ui/react-dropdown-menu';
import { Drawer } from 'vaul';

const plain = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * `items`: [{ key, name, mark?, sub? }]; `children` is the trigger (one
 * element); `onPick(key)` gets the chosen item. Names that start with what's
 * typed come first, then names that contain it.
 */
export function SchoolPicker({ children, items, current, onPick, isMobile, placeholder = 'Find a school', title = 'School', none = 'No school matches.' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const want = plain(q);
  const list = useMemo(
    () => (want ? [...items.filter((i) => plain(i.name).startsWith(want)), ...items.filter((i) => !plain(i.name).startsWith(want) && plain(i.name).includes(want))] : items),
    [items, want],
  );
  const change = (o) => { setOpen(o); if (!o) setQ(''); };
  const pick = (key) => { change(false); onPick(key); };
  const box = (autoFocus) => (
    <input
      className="tp-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} autoFocus={autoFocus}
      // typing is the filter's, not the menu's own type-to-jump
      onKeyDown={(e) => { if (e.key === 'Enter' && list.length) pick(list[0].key); else if (e.key !== 'Escape' && e.key !== 'ArrowDown' && e.key !== 'Tab') e.stopPropagation(); }}
    />
  );
  const row = (i) => (
    <>
      {i.mark ? <img className="tp-logo" src={i.mark} alt="" loading="lazy" /> : <b className="tp-ini">{i.name[0]}</b>}
      <span className="tp-name">{i.name}</span>
      {i.sub && <span className="tp-rec">{i.sub}</span>}
    </>
  );
  const empty = list.length === 0 && <p className="tp-none">{none}</p>;

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={change}>
        <Drawer.Trigger asChild>{children}</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Overlay className="sheet-ov" />
          <Drawer.Content className="sheet" aria-describedby={undefined}>
            <Drawer.Title className="sheet-title">{title}</Drawer.Title>
            <div className="tp-top">{box(false)}</div>
            <div className="sheet-body">
              {empty}
              {list.map((i) => (
                <button key={i.key} className={'mi tp-row' + (i.key === current ? ' on' : '')} onClick={() => pick(i.key)}>{row(i)}</button>
              ))}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }
  return (
    <DM.Root open={open} onOpenChange={change} modal={false}>
      <DM.Trigger asChild>{children}</DM.Trigger>
      <DM.Portal>
        <DM.Content className="menu tp-menu" sideOffset={6} collisionPadding={12} align="end">
          <div className="tp-top">{box(true)}</div>
          <div className="tp-list">
            {empty}
            {list.map((i) => (
              <DM.Item key={i.key} className={'mi tp-row' + (i.key === current ? ' on' : '')} onSelect={() => pick(i.key)}>{row(i)}</DM.Item>
            ))}
          </div>
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
