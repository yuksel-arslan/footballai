# Contributing to FootballAI

First off, thank you for considering contributing to FootballAI! 🎉

## Development Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pnpm test`)
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Example:
```
feat: add team statistics endpoint
fix: resolve cache invalidation bug
docs: update API documentation
```

## Code Style

- TypeScript strict mode
- Prettier for formatting
- ESLint for linting
- Run `pnpm lint` before committing

## Testing

- Write tests for new features
- Ensure all tests pass: `pnpm test`
- Aim for >80% code coverage

## Pull Request Guidelines

- Keep PRs focused and small
- Update documentation if needed
- Add tests for new features
- Ensure CI/CD passes
- Link related issues

## Questions?

Feel free to open an issue for any questions or discussions!

Thank you! 🙏
