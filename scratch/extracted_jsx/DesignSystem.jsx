/* @ds-bundle: {"format":3,"namespace":"AirbnbDesignSystem_019df1","components":[{"name":"Button","sourcePath":"components/buttons/Button.jsx"},{"name":"IconButton","sourcePath":"components/buttons/IconButton.jsx"},{"name":"Card","sourcePath":"components/cards/Card.jsx"},{"name":"PropertyCard","sourcePath":"components/cards/PropertyCard.jsx"},{"name":"Avatar","sourcePath":"components/data-display/Avatar.jsx"},{"name":"Badge","sourcePath":"components/data-display/Badge.jsx"},{"name":"RatingDisplay","sourcePath":"components/data-display/RatingDisplay.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"ProductTab","sourcePath":"components/navigation/ProductTab.jsx"},{"name":"SearchBar","sourcePath":"components/navigation/SearchBar.jsx"}],"sourceHashes":{"components/buttons/Button.jsx":"3525f5546331","components/buttons/IconButton.jsx":"5b4315b7a577","components/cards/Card.jsx":"c2d76a7e79b6","components/cards/PropertyCard.jsx":"0ce7b0c2c2c3","components/data-display/Avatar.jsx":"42ddebdc70ff","components/data-display/Badge.jsx":"b14a23615408","components/data-display/RatingDisplay.jsx":"a9e1c9356c43","components/forms/Input.jsx":"17e9ebdb0158","components/navigation/ProductTab.jsx":"ba1f2b4026be","components/navigation/SearchBar.jsx":"f13450207fb1"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.AirbnbDesignSystem_019df1 = window.AirbnbDesignSystem_019df1 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/buttons/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Airbnb Button. One Rausch voltage for primary actions; quiet ink
 * outline and text variants for everything else. 8px radius, 48px tall.
 */
function Button({
  variant = 'primary',
  size = 'md',
  pill = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  children,
  style,
  ...rest
}) {
  const sizes = {
    md: {
      height: 48,
      padding: '0 24px',
      fontSize: 'var(--type-button-size)'
    },
    sm: {
      height: 40,
      padding: '0 16px',
      fontSize: 'var(--type-button-size)'
    },
    lg: {
      height: 56,
      padding: '0 28px',
      fontSize: 18
    }
  };
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'var(--font-sans)',
    fontWeight: 'var(--weight-medium)',
    lineHeight: 1,
    letterSpacing: 0,
    border: 'none',
    borderRadius: pill ? 'var(--radius-full)' : 'var(--radius-sm)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    width: fullWidth ? '100%' : 'auto',
    transition: 'background-color .15s ease, transform .1s ease, color .15s ease',
    whiteSpace: 'nowrap',
    ...sizes[size]
  };
  const variants = {
    primary: {
      background: disabled ? 'var(--color-primary-disabled)' : 'var(--color-primary)',
      color: 'var(--color-on-primary)'
    },
    secondary: {
      background: 'var(--color-canvas)',
      color: 'var(--color-ink)',
      border: '1px solid var(--color-ink)'
    },
    tertiary: {
      background: 'transparent',
      color: 'var(--color-ink)',
      textDecoration: 'underline',
      height: 'auto',
      padding: '8px 0'
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    style: {
      ...base,
      ...variants[variant],
      ...style
    },
    onMouseDown: e => {
      if (!disabled && variant === 'primary') e.currentTarget.style.background = 'var(--color-primary-active)';
    },
    onMouseUp: e => {
      if (!disabled && variant === 'primary') e.currentTarget.style.background = 'var(--color-primary)';
    },
    onMouseLeave: e => {
      if (!disabled && variant === 'primary') e.currentTarget.style.background = 'var(--color-primary)';
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/Button.jsx", error: String((e && e.message) || e) }); }

// components/buttons/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Circular icon button. Two surfaces: a soft grey fill (`circle`,
 * 32px — e.g. wishlist heart, toolbar back-arrow) and a white
 * hairline-outlined version (`outline`, 40px).
 */
function IconButton({
  variant = 'outline',
  size,
  active = false,
  ariaLabel,
  children,
  style,
  ...rest
}) {
  const dim = size || (variant === 'circle' ? 32 : 40);
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: dim,
    height: dim,
    padding: 0,
    borderRadius: 'var(--radius-full)',
    cursor: 'pointer',
    color: active ? 'var(--color-primary)' : 'var(--color-ink)',
    transition: 'transform .1s ease, background-color .15s ease'
  };
  const variants = {
    circle: {
      background: 'var(--color-surface-strong)',
      border: 'none'
    },
    outline: {
      background: 'var(--color-canvas)',
      border: '1px solid var(--color-hairline)'
    },
    ghost: {
      background: 'transparent',
      border: 'none'
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    "aria-label": ariaLabel,
    style: {
      ...base,
      ...variants[variant],
      ...style
    },
    onMouseDown: e => e.currentTarget.style.transform = 'scale(0.92)',
    onMouseUp: e => e.currentTarget.style.transform = 'scale(1)',
    onMouseLeave: e => e.currentTarget.style.transform = 'scale(1)'
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/cards/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Generic content surface — rounded card with soft border and optional
 * hover float shadow. The system only has one shadow tier.
 */
function Card({
  children,
  padded = true,
  hover = false,
  border = true,
  style,
  ...rest
}) {
  const [hovered, setHovered] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    style: {
      background: 'var(--color-surface-card)',
      borderRadius: 'var(--radius-md)',
      border: border ? '1px solid var(--color-hairline)' : 'none',
      padding: padded ? 'var(--space-lg)' : 0,
      boxShadow: hover && hovered ? 'var(--shadow-float)' : 'none',
      transition: 'box-shadow .2s ease',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/Card.jsx", error: String((e && e.message) || e) }); }

// components/cards/PropertyCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const HeartIcon = ({
  filled
}) => /*#__PURE__*/React.createElement("svg", {
  width: "18",
  height: "18",
  viewBox: "0 0 24 24",
  fill: filled ? 'var(--color-primary)' : 'none',
  stroke: filled ? 'var(--color-primary)' : 'currentColor',
  strokeWidth: "2",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"
}));
const StarIcon = () => /*#__PURE__*/React.createElement("svg", {
  width: "12",
  height: "12",
  viewBox: "0 0 24 24",
  fill: "var(--color-ink)",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
}));

/**
 * Photo-first property card. 1:1 aspect-ratio image with rounded corners,
 * "Guest favorite" badge, heart toggle, and 4-line meta block beneath.
 */
function PropertyCard({
  photo,
  title,
  location,
  dates,
  price,
  priceUnit = 'night',
  rating,
  reviewCount,
  saved = false,
  favorite = false,
  badge,
  onSaveToggle,
  style,
  ...rest
}) {
  const [isSaved, setIsSaved] = React.useState(saved);
  const handleSave = e => {
    e.preventDefault();
    const next = !isSaved;
    setIsSaved(next);
    onSaveToggle && onSaveToggle(next);
  };
  return /*#__PURE__*/React.createElement("article", _extends({
    style: {
      fontFamily: 'var(--font-sans)',
      color: 'var(--color-ink)',
      cursor: 'pointer',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      aspectRatio: '1/1',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: 'var(--color-surface-soft)'
    }
  }, photo ? /*#__PURE__*/React.createElement("img", {
    src: photo,
    alt: title,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transition: 'transform .3s ease'
    },
    onMouseEnter: e => e.currentTarget.style.transform = 'scale(1.03)',
    onMouseLeave: e => e.currentTarget.style.transform = 'scale(1)'
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100%',
      background: 'var(--color-surface-strong)'
    }
  }), (favorite || badge) && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 12,
      left: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      background: 'var(--color-canvas)',
      color: 'var(--color-ink)',
      fontSize: 'var(--type-badge-size)',
      fontWeight: 'var(--type-badge-weight)',
      padding: '5px 10px',
      borderRadius: 'var(--radius-full)',
      boxShadow: 'var(--shadow-float)'
    }
  }, badge || 'Guest favorite')), /*#__PURE__*/React.createElement("button", {
    "aria-label": isSaved ? 'Remove from wishlist' : 'Save to wishlist',
    onClick: handleSave,
    style: {
      position: 'absolute',
      top: 12,
      right: 12,
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: isSaved ? 'var(--color-primary)' : 'var(--color-canvas)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 4
    }
  }, /*#__PURE__*/React.createElement(HeartIcon, {
    filled: isSaved
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 'var(--space-sm)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-title-md-size)',
      fontWeight: 'var(--type-title-md-weight)',
      lineHeight: 1.3,
      flex: 1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, title || 'Cozy mountain retreat'), rating && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 3,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(StarIcon, null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-body-sm-size)',
      fontWeight: 500
    }
  }, rating))), location && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-body-sm-size)',
      color: 'var(--color-muted)',
      marginTop: 2
    }
  }, location), dates && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-body-sm-size)',
      color: 'var(--color-muted)'
    }
  }, dates), price && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-body-sm-size)',
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, "$", price), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-muted)'
    }
  }, " / ", priceUnit))));
}
Object.assign(__ds_scope, { PropertyCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/PropertyCard.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Circular avatar. Renders an image when `src` is given, otherwise the
 * initial on a soft grey disc. Optional Rausch "Superhost" ring.
 */
function Avatar({
  src,
  name = '',
  size = 40,
  ring = false,
  style,
  ...rest
}) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
    flexShrink: 0,
    background: 'var(--color-surface-strong)',
    color: 'var(--color-ink)',
    fontFamily: 'var(--font-sans)',
    fontWeight: 'var(--weight-semibold)',
    fontSize: Math.round(size * 0.4),
    boxShadow: ring ? '0 0 0 2px var(--color-canvas), 0 0 0 4px var(--color-primary)' : 'none'
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      ...base,
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : initial);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Small status pill. `favorite` = the white "Guest favorite" badge that
 * floats over a photo (shadow tier). `new` = the tiny uppercase "NEW" tag
 * on product nav. `solid` = a Rausch chip for counts/labels.
 */
function Badge({
  variant = 'favorite',
  children,
  style,
  ...rest
}) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    fontFamily: 'var(--font-sans)',
    whiteSpace: 'nowrap',
    borderRadius: 'var(--radius-full)'
  };
  const variants = {
    favorite: {
      background: 'var(--color-canvas)',
      color: 'var(--color-ink)',
      fontSize: 'var(--type-badge-size)',
      fontWeight: 'var(--type-badge-weight)',
      padding: '5px 10px',
      boxShadow: 'var(--shadow-float)'
    },
    new: {
      background: 'var(--color-canvas)',
      color: 'var(--color-ink)',
      fontSize: 'var(--type-tag-size)',
      fontWeight: 'var(--type-tag-weight)',
      letterSpacing: 'var(--type-tag-ls)',
      textTransform: 'uppercase',
      padding: '3px 6px',
      boxShadow: 'var(--shadow-float)'
    },
    solid: {
      background: 'var(--color-primary)',
      color: 'var(--color-on-primary)',
      fontSize: 'var(--type-badge-size)',
      fontWeight: 'var(--type-badge-weight)',
      padding: '4px 8px'
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      ...base,
      ...variants[variant],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/data-display/RatingDisplay.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const Laurel = ({
  flip
}) => /*#__PURE__*/React.createElement("svg", {
  width: "24",
  height: "56",
  viewBox: "0 0 24 56",
  fill: "none",
  style: {
    transform: flip ? 'scaleX(-1)' : 'none'
  },
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M20 2C9 6 3 16 3 28s6 22 17 26",
  stroke: "var(--color-ink)",
  strokeWidth: "2",
  strokeLinecap: "round",
  fill: "none"
}), /*#__PURE__*/React.createElement("g", {
  stroke: "var(--color-ink)",
  strokeWidth: "1.6",
  strokeLinecap: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "M8 12c-2-1-4-1-6 0M9 20c-2-1-4-1.5-7-1M9 28c-2 0-4 0-7 1M9 36c-2 1-4 1.5-7 1M10 44c-2 1-4 2-6 3"
})));

/**
 * The signature listing-detail rating moment: a 64px/700 number flanked
 * by laurel ornaments. The single loudest typographic element in the system.
 */
function RatingDisplay({
  value = '4.81',
  caption = 'Guest favorite',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: 'var(--font-sans)',
      color: 'var(--color-ink)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Laurel, null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-rating-size)',
      fontWeight: 'var(--type-rating-weight)',
      lineHeight: 'var(--type-rating-lh)',
      letterSpacing: 'var(--type-rating-ls)'
    }
  }, value), /*#__PURE__*/React.createElement(Laurel, {
    flip: true
  })), caption && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-title-md-size)',
      fontWeight: 'var(--type-title-md-weight)',
      marginTop: 4
    }
  }, caption));
}
Object.assign(__ds_scope, { RatingDisplay });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/RatingDisplay.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Text input. White surface, 1px hairline, 8px radius, 56px tall, stacked
 * caption label. On focus the border thickens to 2px ink — no glow, no ring.
 */
function Input({
  label,
  error,
  id,
  style,
  containerStyle,
  ...rest
}) {
  const inputId = id || (label ? `in-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const [focused, setFocused] = React.useState(false);
  const borderColor = error ? 'var(--color-error)' : focused ? 'var(--color-ink)' : 'var(--color-hairline)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      ...containerStyle
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-caption-size)',
      fontWeight: 'var(--type-caption-weight)',
      color: 'var(--color-muted)'
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    onFocus: e => {
      setFocused(true);
      rest.onFocus && rest.onFocus(e);
    },
    onBlur: e => {
      setFocused(false);
      rest.onBlur && rest.onBlur(e);
    },
    style: {
      height: 56,
      padding: '0 14px',
      background: 'var(--color-canvas)',
      color: 'var(--color-ink)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-body-md-size)',
      border: `${focused || error ? 2 : 1}px solid ${borderColor}`,
      borderRadius: 'var(--radius-sm)',
      outline: 'none',
      transition: 'border-color .15s ease',
      ...style
    }
  }, rest)), error && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-body-sm-size)',
      color: 'var(--color-error)'
    }
  }, error));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/navigation/ProductTab.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Top-nav product tab (Homes / Experiences / Services). Illustrated glyph
 * over a label, with a 2px ink underline rule when active and an optional
 * "NEW" badge anchored top-right.
 */
function ProductTab({
  label,
  icon,
  active = false,
  isNew = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    style: {
      position: 'relative',
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: '8px 4px 14px',
      fontFamily: 'var(--font-sans)',
      color: active ? 'var(--color-ink)' : 'var(--color-muted)',
      opacity: active ? 1 : 0.85,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      filter: active ? 'none' : 'grayscale(0.2)'
    }
  }, icon), isNew && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: -6,
      left: '100%',
      marginLeft: -8,
      background: 'var(--color-ink)',
      color: 'var(--color-on-dark)',
      fontSize: 'var(--type-tag-size)',
      fontWeight: 'var(--type-tag-weight)',
      letterSpacing: 'var(--type-tag-ls)',
      textTransform: 'uppercase',
      padding: '2px 5px',
      borderRadius: 'var(--radius-full)',
      lineHeight: 1
    }
  }, "New")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-nav-size)',
      fontWeight: active ? 'var(--type-nav-weight)' : 500
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 2,
      background: active ? 'var(--color-ink)' : 'transparent',
      borderRadius: 2
    }
  }));
}
Object.assign(__ds_scope, { ProductTab });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/ProductTab.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SearchBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SearchGlyph = () => /*#__PURE__*/React.createElement("svg", {
  width: "16",
  height: "16",
  viewBox: "0 0 24 24",
  fill: "none",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("circle", {
  cx: "11",
  cy: "11",
  r: "7",
  stroke: "currentColor",
  strokeWidth: "2.4"
}), /*#__PURE__*/React.createElement("path", {
  d: "m20 20-3.2-3.2",
  stroke: "currentColor",
  strokeWidth: "2.4",
  strokeLinecap: "round"
}));

/**
 * The signature global search pill. White fill, fully rounded, resting
 * shadow tier, divided by hairlines into Where / When / Who segments and
 * terminated by a circular Rausch search orb.
 */
function SearchBar({
  segments,
  onSearch,
  compact = false,
  style,
  ...rest
}) {
  const segs = segments || [{
    label: 'Where',
    value: 'Search destinations'
  }, {
    label: 'When',
    value: 'Add dates'
  }, {
    label: 'Who',
    value: 'Add guests'
  }];
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "search",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      background: 'var(--color-canvas)',
      border: '1px solid var(--color-hairline)',
      borderRadius: 'var(--radius-full)',
      boxShadow: 'var(--shadow-float)',
      height: compact ? 48 : 64,
      paddingRight: 8,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, rest), segs.map((s, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: s.label
  }, i > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 24,
      background: 'var(--color-hairline)'
    }
  }), /*#__PURE__*/React.createElement("button", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 2,
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: compact ? '0 16px' : '8px 24px',
      borderRadius: 'var(--radius-full)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-caption-size)',
      fontWeight: 'var(--type-caption-weight)',
      color: 'var(--color-ink)'
    }
  }, s.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-body-sm-size)',
      color: 'var(--color-muted)'
    }
  }, s.value)))), /*#__PURE__*/React.createElement("button", {
    "aria-label": "Search",
    onClick: onSearch,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: compact ? 36 : 48,
      minWidth: compact ? 36 : 48,
      marginLeft: 8,
      padding: 0,
      borderRadius: 'var(--radius-full)',
      border: 'none',
      cursor: 'pointer',
      background: 'var(--color-primary)',
      color: 'var(--color-on-primary)'
    },
    onMouseDown: e => e.currentTarget.style.background = 'var(--color-primary-active)',
    onMouseUp: e => e.currentTarget.style.background = 'var(--color-primary)',
    onMouseLeave: e => e.currentTarget.style.background = 'var(--color-primary)'
  }, /*#__PURE__*/React.createElement(SearchGlyph, null)));
}
Object.assign(__ds_scope, { SearchBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SearchBar.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.PropertyCard = __ds_scope.PropertyCard;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.RatingDisplay = __ds_scope.RatingDisplay;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.ProductTab = __ds_scope.ProductTab;

__ds_ns.SearchBar = __ds_scope.SearchBar;

})();
