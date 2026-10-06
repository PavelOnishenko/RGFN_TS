# RGFN red-tests runbook

RGFN tests import compiled files from `dist/`, so a missing or stale build can cause broad `ERR_MODULE_NOT_FOUND` failures.

From the RGFN repository root, use the canonical command:

```bash
npm test
```

It runs `npm run build` before the recursive test-file runner. An individual assertion failure after a successful build is a behavior or expectation mismatch rather than a missing-build problem.
