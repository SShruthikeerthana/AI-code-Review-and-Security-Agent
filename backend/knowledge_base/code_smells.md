# Code Smells and Design Anti-Patterns

## What Are Code Smells?

Code smells are surface indicators of deeper problems in software design. They don't necessarily mean the code is broken, but they suggest refactoring opportunities that improve maintainability, readability, and testability.

## Common Code Smells

### Long Method

Methods exceeding 30-50 lines often do too much. Break into smaller, focused methods with descriptive names.

**Indicator:** Method requires scrolling to read entirely; multiple levels of nesting.

**Fix:** Extract Method refactoring — each method should do one thing.

### Large Class (God Class)

A class that knows too much or does too much. Violates Single Responsibility Principle.

**Indicator:** Class has 500+ lines, dozens of methods, or handles unrelated concerns.

**Fix:** Split into cohesive classes grouped by responsibility.

### Duplicate Code

Identical or near-identical code in multiple places.

**Indicator:** Copy-pasted blocks with minor variations.

**Fix:** Extract common logic into shared functions, base classes, or utility modules.

### Long Parameter List

Functions with more than 3-4 parameters are hard to understand and use.

**Fix:** Introduce parameter objects or builder pattern.

```python
# Smell
def create_user(name, email, age, address, phone, role, department):
    ...

# Better
@dataclass
class UserCreateRequest:
    name: str
    email: str
    age: int
    address: str
    phone: str
    role: str
    department: str

def create_user(request: UserCreateRequest):
    ...
```

### Feature Envy

A method uses data from another class more than its own.

**Fix:** Move the method to the class whose data it uses most.

### Data Clumps

Groups of variables that always appear together.

**Fix:** Extract into a dedicated class or data structure.

### Primitive Obsession

Overuse of primitives instead of small objects for simple tasks (money, date ranges, coordinates).

**Fix:** Create value objects with validation logic encapsulated.

### Switch Statements (Type Code)

Complex switch/if-else chains based on type codes.

**Fix:** Replace with polymorphism — strategy pattern or class hierarchy.

### Speculative Generality

Unused abstractions added "just in case."

**Fix:** YAGNI (You Aren't Gonna Need It) — remove unused abstractions.

### Dead Code

Unused variables, methods, imports, or unreachable code paths.

**Fix:** Remove immediately. Version control preserves history.

## Complexity Metrics

### Cyclomatic Complexity

Measures the number of independent paths through code. High complexity (>10) indicates methods that are hard to test and maintain.

**Tools:** Radon (Python), PMD (Java)

**Thresholds:**
- 1-10: Simple, low risk
- 11-20: Moderate complexity, consider refactoring
- 21+: High complexity, refactor required

### Cognitive Complexity

Measures how difficult code is to understand (nesting, breaks in linear flow).

**Reduce by:**
- Early returns instead of deep nesting
- Guard clauses at method start
- Flattening conditional logic

```python
# High cognitive complexity
def process(data):
    if data:
        if data.is_valid:
            if data.user:
                if data.user.is_active:
                    return do_work(data)
    return None

# Lower complexity with guard clauses
def process(data):
    if not data or not data.is_valid:
        return None
    if not data.user or not data.user.is_active:
        return None
    return do_work(data)
```

## Design Anti-Patterns

### Spaghetti Code

Unstructured, tangled control flow with goto-like patterns through exceptions and callbacks.

**Fix:** Apply structured programming; use clear abstractions and layering.

### Golden Hammer

Using the same solution (often a favorite framework) for every problem.

**Fix:** Choose tools appropriate to each problem domain.

### Copy-Paste Programming

Duplicating code instead of abstracting shared behavior.

**Fix:** DRY (Don't Repeat Yourself) — extract shared logic.

### Magic Numbers/Strings

Hardcoded values without named constants.

```python
# Smell
if status == 3:
    ...

# Better
STATUS_COMPLETED = 3
if status == STATUS_COMPLETED:
    ...
```

### Tight Coupling

Classes that depend heavily on implementation details of other classes.

**Fix:** Depend on interfaces/abstractions; use dependency injection.

### Anemic Domain Model

Domain objects with only getters/setters; all logic in service classes.

**Fix:** Move behavior into domain objects where it belongs.

## Severity Mapping for Code Review

| Smell | Default Severity |
|-------|-----------------|
| SQL Injection / Hardcoded Secret | Critical |
| Long Method (>100 lines) | Medium |
| Duplicate Code (3+ instances) | Medium |
| Dead Code | Low |
| Magic Numbers | Low |
| God Class | High |
| High Cyclomatic Complexity (>20) | High |
