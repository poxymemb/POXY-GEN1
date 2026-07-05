/* WAITLIST — the soft signal for those not ready to pay. Email capture with
   a weekly-unveiling opt-in. On success it assigns a Passport reservation
   number so even a free signup owns a number from minute zero (endowment).
   The real double-opt-in (Supabase OTP) lands in Step 1; here it is a mock
   that mirrors the success shape. PROMPT 00 section 9. */
import { el } from '../../../lib/dom';
import { Input, Toggle, Button } from '../../../ui';
import { reserveDemoPassportNumber } from '../mock-state';

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function waitlistSection(): HTMLElement {
  let weekly = true;
  const email = Input({
    label: 'Email',
    name: 'waitlist-email',
    type: 'email',
    placeholder: 'you@example.com',
    autocomplete: 'email',
  });

  const weeklyToggle = Toggle({
    label: 'Email me each weekly unveiling',
    checked: true,
    onChange: (v) => {
      weekly = v;
    },
  });

  const submit = Button({ label: 'Reserve my passport', variant: 'primary', size: 'l', type: 'submit' });

  const form = el('form', { class: 'px-waitlist__form' }, [
    email.root,
    weeklyToggle,
    submit.root,
  ]) as HTMLFormElement;

  const success = el('div', { class: 'px-waitlist__success', hidden: true });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = email.input.value.trim();
    if (!isEmail(value)) {
      email.setError('Enter a valid email so we can send the confirmation.');
      return;
    }
    // Mock: Step 1 sends a double-opt-in OTP; the passport № is assigned on
    // confirm. Here we show the shape immediately.
    const passportNo = reserveDemoPassportNumber();
    const passportLabel = `\u2116 ${passportNo.toLocaleString('en-GB')}`;
    success.textContent = '';
    success.append(
      el('p', { class: 't-heading' }, ['Check your inbox to confirm.']),
      el('p', { class: 't-body px-waitlist__success-note' }, [
        weekly
          ? 'Once confirmed, your passport is reserved and a note arrives each week the curator unveils a figure.'
          : 'Once confirmed, your passport is reserved.',
      ]),
      el('div', { class: 'px-waitlist__passport' }, [
        el('span', { class: 't-caption' }, ['Your passport']),
        el('span', { class: 'plaque' }, [passportLabel]),
      ]),
    );
    form.hidden = true;
    success.hidden = false;
  });

  return el(
    'section',
    { class: 'px-lp__section px-waitlist', 'data-env': 'gallery', id: 'px-lp-waitlist' },
    [
      el('div', { class: 'px-lp__col px-lp__reveal' }, [
        el('p', { class: 'px-lp__eyebrow t-caption' }, ['The soft door']),
        el('h2', { class: 'px-lp__section-title t-title' }, ['Reserve a passport, free']),
        el('p', { class: 'px-lp__lead t-body' }, [
          'Not ready to found? Leave an email and we hold a passport number for you. No charge, no obligation.',
        ]),
        form,
        success,
      ]),
    ],
  );
}
