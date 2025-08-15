# Style Guide - DCCI Ministries Website

## 🎨 Design Principles

### **Accessibility First**
- All colors must meet WCAG AA contrast requirements
- Text should be readable in both light and dark modes
- Interactive elements must have clear focus indicators

### **Consistency**
- Use Ionic theme variables for all colors
- Maintain consistent spacing and typography
- Follow established component patterns

## 🌓 Dark/Light Mode Standards

### **Core Principle**
**The application automatically follows the user's device/system preference for dark or light mode. No manual toggle is provided.**

### **Implementation Requirements**

1. **CSS Media Queries**
   ```scss
   @media (prefers-color-scheme: dark) {
     // Dark mode styles
   }
   
   @media (prefers-color-scheme: light) {
     // Light mode styles
   }
   ```

2. **Ionic Theme Variables**
   - **Primary Colors**: `var(--ion-color-primary)`, `var(--ion-color-primary-shade)`, `var(--ion-color-primary-tint)`
   - **Text Colors**: `var(--ion-color-dark)`, `var(--ion-color-light)`, `var(--ion-color-medium)`
   - **Background Colors**: `var(--ion-color-light)`, `var(--ion-color-dark)`

3. **Automatic Adaptation**
   - Colors automatically adjust based on system preference
   - No hardcoded color values
   - Maintains accessibility in both themes

### **Testing Requirements**

- Test in both light and dark modes during development
- Verify contrast ratios meet accessibility standards
- Ensure all interactive elements are visible in both themes

## 🎯 Color Usage

### **Primary Colors**
- **Primary Blue**: Main brand color for buttons and links
- **Primary Shade**: Darker variant for hover states
- **Primary Tint**: Lighter variant for better contrast on dark backgrounds

### **Text Colors**
- **Dark Text**: `var(--ion-color-dark)` for light backgrounds
- **Light Text**: `var(--ion-color-light)` for dark backgrounds
- **Medium Text**: `var(--ion-color-medium)` for secondary content

### **Background Colors**
- **Light Backgrounds**: `var(--ion-color-light)` for content areas
- **Dark Backgrounds**: `var(--ion-color-dark)` for headers/footers
- **Gradients**: Use primary color variations for visual interest

## 📱 Responsive Design

### **Breakpoints**
- **Mobile**: 480px and below
- **Tablet**: 768px and below
- **Desktop**: Above 768px

### **Scaling Guidelines**
- Text scales proportionally across breakpoints
- Icons maintain consistent sizing ratios
- Spacing adjusts for optimal mobile experience

## 🔧 CSS Standards

### **Naming Conventions**
- Use BEM methodology for component classes
- Prefix utility classes appropriately
- Maintain consistent naming patterns

### **File Organization**
- Component-specific styles in component files
- Global styles in `global.scss`
- Theme variables defined at root level

### **Performance**
- Minimize CSS specificity conflicts
- Use CSS custom properties for theming
- Avoid unnecessary `!important` declarations

## ♿ Accessibility Standards

### **Contrast Requirements**
- **Normal Text**: Minimum 4.5:1 contrast ratio
- **Large Text**: Minimum 3:1 contrast ratio
- **Interactive Elements**: Clear focus indicators

### **Keyboard Navigation**
- All interactive elements must be keyboard accessible
- Focus order follows logical document flow
- Skip links for complex pages (not needed for simple layouts)

### **Screen Reader Support**
- Proper ARIA labels and roles
- Semantic HTML structure
- Descriptive alt text for images

## 📝 Documentation Requirements

### **Code Comments**
- Document complex CSS logic
- Explain non-obvious color choices
- Note accessibility considerations

### **Component Documentation**
- Document color usage for each component
- Explain responsive behavior
- Note any accessibility features

## 🚫 Anti-Patterns

### **Avoid These Practices**
- Hardcoded color values
- Manual dark/light mode toggles
- Inconsistent spacing units
- Overly specific CSS selectors
- Accessibility-unfriendly color combinations

### **Instead, Use**
- Ionic theme variables
- System preference detection
- Consistent spacing scale
- Semantic class names
- WCAG-compliant color combinations 
