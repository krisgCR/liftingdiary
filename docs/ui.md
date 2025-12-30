# UI Coding Standards

This document outlines the UI coding standards for the Lifting Diary project. All contributors must follow these guidelines.

## Component Library

**Use shadcn/ui exclusively.** No custom UI components should be created.

- All UI components MUST come from [shadcn/ui](https://ui.shadcn.com/)
- Install components via `npx shadcn@latest add <component>`
- Components are installed to `src/components/ui/`
- Do not modify shadcn component internals; use props and className for customization

## Accessibility

All components and pages must be accessible:

- Use semantic HTML elements (`<main>`, `<nav>`, `<section>`, `<article>`, etc.)
- Ensure proper heading hierarchy (`h1` → `h2` → `h3`)
- Include `aria-label` for icon-only buttons
- Maintain keyboard navigation support (shadcn handles this by default)
- Ensure sufficient color contrast (minimum 4.5:1 for normal text)
- Provide focus indicators for interactive elements
- Use `sr-only` class for screen reader-only text when needed

## Responsiveness

All pages and components must be responsive:

- Design mobile-first, then scale up
- Use Tailwind responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- Test on common breakpoints:
  - Mobile: 320px - 639px
  - Tablet: 640px - 1023px
  - Desktop: 1024px+
- Avoid fixed widths; use `max-w-*`, `w-full`, or responsive units
- Use CSS Grid or Flexbox for layouts

## Date Formatting

Use `date-fns` for all date formatting with ordinal day format:

```typescript
import { format } from "date-fns";

// Standard date format: "1st Sep 2025", "4th Jun 2024"
const formatDate = (date: Date): string => {
  return format(date, "do MMM yyyy");
};

// Examples:
// new Date("2025-09-01") → "1st Sep 2025"
// new Date("2024-06-04") → "4th Jun 2024"
// new Date("2025-12-25") → "25th Dec 2025"
```

### Date Format Reference

| Token  | Output           | Description               |
| ------ | ---------------- | ------------------------- |
| `do`   | 1st, 2nd, 3rd... | Day of month with ordinal |
| `MMM`  | Jan, Feb, Mar... | Abbreviated month         |
| `yyyy` | 2024, 2025...    | Full year                 |

## Styling Guidelines

### Tailwind CSS

- Use Tailwind utility classes exclusively for styling
- Avoid inline styles and custom CSS unless absolutely necessary
- Follow the project's color scheme via CSS variables defined in `globals.css`
- Use the `cn()` utility from `@/lib/utils` for conditional classes:

```typescript
import { cn } from "@/lib/utils";

<div className={cn("base-class", conditional && "conditional-class")} />;
```

### Spacing

- Use consistent spacing scale: `4`, `8`, `12`, `16`, `24`, `32`, `48`, `64`
- Prefer `gap-*` for flex/grid layouts over margin

### Typography

- Use the Geist font family (already configured)
- Stick to Tailwind's typography scale (`text-sm`, `text-base`, `text-lg`, etc.)

## Component Patterns

### Forms

- Use shadcn's Form components with react-hook-form
- Always include validation feedback
- Use appropriate input types (`email`, `number`, `date`, etc.)
- Include labels for all form fields

### Loading States

- Use shadcn's Skeleton component for loading states
- Show loading indicators for async operations
- Disable buttons during form submission

### Error States

- Display user-friendly error messages
- Use shadcn's Alert component for error notifications
- Never expose technical error details to users

## File Organization

```
src/
├── components/
│   └── ui/          # shadcn components only
├── app/
│   └── [page]/
│       └── page.tsx # Page components
└── lib/
    └── utils.ts     # Utility functions including cn()
```

## Best Practices

1. **Keep components small and focused** - Each component should do one thing well
2. **Use TypeScript strictly** - Define proper types for all props
3. **Avoid prop drilling** - Use React context or state management when needed
4. **Optimize images** - Use Next.js `Image` component with proper sizing
5. **Lazy load when appropriate** - Use dynamic imports for heavy components
6. **Test on real devices** - Emulators don't catch all responsive issues
