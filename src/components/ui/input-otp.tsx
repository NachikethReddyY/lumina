import * as React from 'react';
import { OTPInput, OTPInputContext, type OTPInputProps } from 'input-otp';
import { cn } from '../../lib/utils';

function InputOTP({
  className,
  containerClassName,
  ...props
}: OTPInputProps & { containerClassName?: string }) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        'flex items-center gap-3 disabled:opacity-50 has-disabled:opacity-50',
        containerClassName
      )}
      className={cn('disabled:cursor-not-allowed', className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="input-otp-group" className={cn('flex items-center gap-3', className)} {...props} />;
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<'div'> & { index: number }) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const slot = inputOTPContext.slots[index];

  return (
    <div
      data-slot="input-otp-slot"
      data-active={slot.isActive ? 'true' : undefined}
      className={cn(
        'relative flex h-14 w-12 items-center justify-center rounded-[10px] border-[1.5px] border-[var(--color-hairline-strong)] bg-[var(--color-surface-card)] text-lg font-semibold text-[var(--color-ink)] shadow-[0_1px_0_color-mix(in_srgb,var(--color-ink)_4%,transparent)] transition-[border-color,box-shadow] duration-150',
        slot.isActive &&
          'z-10 border-[var(--color-primary)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_18%,transparent)]',
        className
      )}
      {...props}
    >
      {slot.char ?? slot.placeholderChar}
      {slot.hasFakeCaret ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-px animate-pulse bg-[var(--color-ink)]" />
        </div>
      ) : null}
    </div>
  );
}

function InputOTPSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="input-otp-separator" className={cn('text-[var(--color-muted)]', className)} role="separator" {...props}>
      -
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };

