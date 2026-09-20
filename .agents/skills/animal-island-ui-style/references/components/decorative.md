# Decorative components — props reference

Props/types below are copied from the library source. In an npm-installed project, the installed package's TypeScript declarations (`dist/types/index.d.ts`) are the ground truth — prefer exploring them when in doubt.

## Footer

```ts
interface FooterProps {
    text?: string; // copyright text — default 'All Rights Reserved.'
    year?: number; // year — default current year (dynamically fetched)
    className?: string;
    style?: React.CSSProperties;
}
```

```tsx
<Footer />                   {/* © 2026 All Rights Reserved. */}
<Footer text="Acme Ltd." />  {/* custom text */}
<Footer text="Acme" year={2020} /> {/* custom year */}
```

Renders a copyright bar `© {year} {text}`, centered, `color: #807d75`, `font-size: 12px`, `padding: 16px 0`. The `year` defaults to the current year; the `text` defaults to `All Rights Reserved.`. Both are overridable, and styling can be customized via `style` / `className`.

