// src/principles/definitions.ts
import { PrincipleDefinition } from '../types';

export const PRINCIPLES: PrincipleDefinition[] = [
  {
    principle_id: 'secrets-zero-touch',
    domain: 'security',
    category: 'secrets_management',
    tier: 'non_negotiable',
    enforce_mode: 'intervention',
    rule: {
      name: 'Secrets Zero Touch',
      description: 'Detects hardcoded secrets, API keys, tokens, and passwords in code',
      triggers: [
        'high-entropy strings matching secret patterns',
        'assignment to variables named *key*, *secret*, *token*, *password*',
        'strings starting with known prefixes (AKIA, sk_live, ghp_)'
      ],
      severity: 'critical'
    },
    evaluation: {
      type: 'pattern_match',
      patterns: [
        '(?i)(api[_\\-]?key|secret[_\\-]?key|auth[_\\-]?token)\\s*=\\s*["\'][^"\']{16,}["\']',
        '(?i)(password|passwd|pwd)\\s*=\\s*["\'][^"\']+["\']',
        'AKIA[0-9A-Z]{16}',
        'sk_live_[0-9a-zA-Z]{24,}',
        'ghp_[0-9a-zA-Z]{36}'
      ],
      negatives: [
        'process\\.env\\.',
        'secrets_manager\\.get',
        'vault\\.read',
        'config\\.from_vault'
      ],
      confidence_threshold: 0.85
    },
    education: {
      why: 'GitHub scans public repos for API keys within seconds of push. Attackers automate secret extraction.',
      how: 'Use environment variables for development, secret managers (Vault, AWS Secrets Manager, Doppler) for production.',
      failure_example: 'Uber 2016: Hardcoded AWS key in GitHub → 57M user records exposed. $148M fine.',
      lesson_id: 'lab-secrets-01',
      analogy: 'Putting your house key under the doormat and posting a photo of your front door online.'
    },
    fix: {
      available: true,
      fix_type: 'auto_refactor',
      template: 'const {{var_name}} = process.env.{{env_var_name}};',
      variables: ['var_name', 'env_var_name']
    },
    tier_behavior: {
      beginner: { action: 'block', explanation_depth: 'full', requires_acknowledgment: true },
      intermediate: { action: 'block', explanation_depth: 'summary', requires_acknowledgment: true },
      advanced: { action: 'block', explanation_depth: 'none', requires_acknowledgment: false, allow_override: true }
    },
    metadata: {
      version: '1.0.0',
      source: 'OWASP',
      last_updated: '2024-01-01T00:00:00Z',
      tags: ['secrets', 'api-keys', 'credentials']
    }
  },
  {
    principle_id: 'input-fortress-sqli',
    domain: 'security',
    category: 'input_validation',
    tier: 'non_negotiable',
    enforce_mode: 'prevention',
    rule: {
      name: 'Input Fortress - SQL Injection Prevention',
      description: 'Prevents SQL injection by detecting string concatenation in queries',
      triggers: [
        'string concatenation in SQL queries',
        'template literals in database calls',
        'user input directly passed to query functions'
      ],
      severity: 'critical'
    },
    evaluation: {
      type: 'ast_walk',
      patterns: [
        'CallExpression where callee is \'query\' and arguments contain TemplateLiteral or BinaryExpression(+)'
      ],
      negatives: [
        'parameterized query patterns',
        'ORM usage with proper binding',
        'prepared statement patterns'
      ],
      confidence_threshold: 0.90
    },
    education: {
      why: 'Unvalidated user input reaching database queries allows attackers to read, modify, or delete all data.',
      how: 'Use parameterized queries or ORM methods that separate data from commands.',
      failure_example: 'Equifax 2017: Unpatched input validation flaw → 147M records. $700M settlement.',
      lesson_id: 'lab-sqli-01',
      analogy: 'A bank teller who executes any note handed to them, including \'give me all the money.\''
    },
    fix: {
      available: true,
      fix_type: 'auto_refactor',
      template: "db.query('SELECT * FROM {{table}} WHERE {{column}} = ?', [{{user_input}}])",
      variables: ['table', 'column', 'user_input']
    },
    tier_behavior: {
      beginner: { action: 'block', explanation_depth: 'full', requires_acknowledgment: true },
      intermediate: { action: 'warn', explanation_depth: 'summary', requires_acknowledgment: false },
      advanced: { action: 'warn', explanation_depth: 'none', requires_acknowledgment: false, allow_override: true }
    },
    metadata: {
      version: '1.0.0',
      source: 'OWASP',
      last_updated: '2024-01-01T00:00:00Z',
      tags: ['sql-injection', 'input-validation']
    }
  },
  {
    principle_id: 'input-fortress-xss',
    domain: 'security',
    category: 'input_validation',
    tier: 'core',
    enforce_mode: 'prevention',
    rule: {
      name: 'Input Fortress - XSS Prevention',
      description: 'Prevents Cross-Site Scripting by detecting unsafe HTML rendering',
      triggers: [
        'innerHTML assignments',
        'dangerouslySetInnerHTML in React',
        'user input rendered without encoding'
      ],
      severity: 'high'
    },
    evaluation: {
      type: 'ast_walk',
      patterns: [
        'AssignmentExpression to innerHTML',
        "JSXAttribute 'dangerouslySetInnerHTML'",
        'TemplateLiteral in JSX without sanitization'
      ],
      negatives: [
        'DOMPurify.sanitize',
        'he.encode',
        'React automatic escaping'
      ],
      confidence_threshold: 0.85
    },
    education: {
      why: 'Rendering user input as HTML allows attackers to steal cookies, impersonate users, or deface applications.',
      how: 'Use framework auto-escaping, or explicit encoding libraries (DOMPurify, he).',
      failure_example: 'Samy worm 2005: XSS on MySpace → 1M profiles infected in 20 hours.',
      lesson_id: 'lab-xss-01',
      analogy: 'Letting strangers write on your walls with permanent markers instead of providing sticky notes.'
    },
    fix: {
      available: true,
      fix_type: 'suggestion',
      template: 'Use DOMPurify.sanitize({{user_content}}) or {{{{user_content}}}} in Handlebars',
      variables: ['user_content']
    },
    tier_behavior: {
      beginner: { action: 'block', explanation_depth: 'full', requires_acknowledgment: true },
      intermediate: { action: 'warn', explanation_depth: 'summary', requires_acknowledgment: false },
      advanced: { action: 'suggest', explanation_depth: 'none', requires_acknowledgment: false, allow_override: true }
    },
    metadata: {
      version: '1.0.0',
      source: 'OWASP',
      last_updated: '2024-01-01T00:00:00Z',
      tags: ['xss', 'input-validation', 'html-encoding']
    }
  },
  {
    principle_id: 'auth-baseline-password',
    domain: 'security',
    category: 'authentication',
    tier: 'non_negotiable',
    enforce_mode: 'intervention',
    rule: {
      name: 'Auth Baseline - Password Storage',
      description: 'Ensures passwords are properly hashed with strong algorithms',
      triggers: [
        'plaintext password storage',
        'weak hashing (md5, sha1 without salt)',
        'password comparison without timing-safe equals'
      ],
      severity: 'critical'
    },
    evaluation: {
      type: 'pattern_match',
      patterns: [
        '(?i)password\\s*=\\s*["\'][^"\']+["\']',
        '(?i)md5\\s*\\(',
        '(?i)sha1\\s*\\(',
        'bcrypt|argon2|scrypt'
      ],
      negatives: [
        'bcrypt.hash',
        'argon2.hash',
        'crypto.timingSafeEqual'
      ],
      confidence_threshold: 0.90
    },
    education: {
      why: 'Password databases are breached constantly. Without proper hashing, attackers get plaintext passwords immediately.',
      how: 'Use bcrypt, Argon2, or scrypt with per-user salts. Never store recoverable passwords.',
      failure_example: 'LinkedIn 2012: SHA1 without salt → 6.5M passwords cracked in days.',
      lesson_id: 'lab-auth-01',
      analogy: 'Storing passwords in a diary vs. storing them as a puzzle that takes centuries to solve.'
    },
    fix: {
      available: true,
      fix_type: 'auto_refactor',
      template: 'const hash = await bcrypt.hash({{password}}, 12);',
      variables: ['password']
    },
    tier_behavior: {
      beginner: { action: 'block', explanation_depth: 'full', requires_acknowledgment: true },
      intermediate: { action: 'block', explanation_depth: 'summary', requires_acknowledgment: true },
      advanced: { action: 'block', explanation_depth: 'none', requires_acknowledgment: false, allow_override: false }
    },
    metadata: {
      version: '1.0.0',
      source: 'OWASP',
      last_updated: '2024-01-01T00:00:00Z',
      tags: ['passwords', 'hashing', 'authentication']
    }
  },
  {
    principle_id: 'auth-baseline-mfa',
    domain: 'security',
    category: 'authentication',
    tier: 'core',
    enforce_mode: 'verification',
    rule: {
      name: 'Auth Baseline - MFA',
      description: 'Checks for MFA on privileged routes and admin operations',
      triggers: [
        'admin route definitions',
        'privileged operation endpoints',
        'authentication middleware without MFA check'
      ],
      severity: 'high'
    },
    evaluation: {
      type: 'config_audit',
      patterns: [
        "route definitions with 'admin', 'superuser', 'delete'",
        "middleware chains without 'mfa' or '2fa'"
      ],
      negatives: [
        'mfa.verify',
        'twoFactor.validate',
        'totp.check'
      ],
      confidence_threshold: 0.80
    },
    education: {
      why: 'Passwords alone are insufficient. MFA prevents 99.9% of automated attacks.',
      how: 'Implement TOTP (Google Authenticator) or WebAuthn for privileged routes.',
      failure_example: 'Twitter 2022: Internal tool lacked MFA → 5.4M profiles sold. $150M fine.',
      lesson_id: 'lab-mfa-01',
      analogy: 'A door with one lock vs. a door with a lock and a fingerprint scanner.'
    },
    fix: {
      available: true,
      fix_type: 'template_injection',
      template: 'Add mfaMiddleware to {{route_path}} in {{router_file}}',
      variables: ['route_path', 'router_file']
    },
    tier_behavior: {
      beginner: { action: 'warn', explanation_depth: 'full', requires_acknowledgment: true },
      intermediate: { action: 'warn', explanation_depth: 'summary', requires_acknowledgment: false },
      advanced: { action: 'suggest', explanation_depth: 'none', requires_acknowledgment: false, allow_override: true }
    },
    metadata: {
      version: '1.0.0',
      source: 'OWASP',
      last_updated: '2024-01-01T00:00:00Z',
      tags: ['mfa', '2fa', 'authentication']
    }
  },
  {
    principle_id: 'dependency-hygiene',
    domain: 'security',
    category: 'dependency_management',
    tier: 'non_negotiable',
    enforce_mode: 'verification',
    rule: {
      name: 'Dependency Hygiene',
      description: 'Monitors dependency changes for known vulnerabilities',
      triggers: [
        'package.json changes',
        'requirements.txt changes',
        'import of new libraries'
      ],
      severity: 'high'
    },
    evaluation: {
      type: 'config_audit',
      patterns: [
        'package.json dependency additions',
        'requirements.txt additions',
        'import statements for new packages'
      ],
      negatives: [],
      confidence_threshold: 0.95
    },
    education: {
      why: "You didn't write 90% of your code — you imported it. Known vulnerabilities in dependencies are attack vectors.",
      how: "Run 'npm audit' or 'safety check' before commits. Pin versions. Use Dependabot/Snyk.",
      failure_example: 'Log4j (CVE-2021-44228): Single logging library → global emergency, 3B devices affected.',
      lesson_id: 'lab-deps-01',
      analogy: 'Buying a house without inspecting the foundation — it looks fine until it collapses.'
    },
    fix: {
      available: true,
      fix_type: 'dependency_swap',
      template: 'Update {{package}} to {{safe_version}} (fixes CVE-{{cve_id}})',
      variables: ['package', 'safe_version', 'cve_id']
    },
    tier_behavior: {
      beginner: { action: 'block', explanation_depth: 'full', requires_acknowledgment: true },
      intermediate: { action: 'block', explanation_depth: 'summary', requires_acknowledgment: true },
      advanced: { action: 'warn', explanation_depth: 'none', requires_acknowledgment: false, allow_override: true }
    },
    metadata: {
      version: '1.0.0',
      source: 'OWASP',
      last_updated: '2024-01-01T00:00:00Z',
      tags: ['dependencies', 'vulnerabilities', 'supply-chain']
    }
  },
  {
    principle_id: 'secure-communication-tls',
    domain: 'security',
    category: 'communication_security',
    tier: 'core',
    enforce_mode: 'prevention',
    rule: {
      name: 'Secure Communication - TLS',
      description: 'Ensures HTTPS usage and proper TLS configuration',
      triggers: [
        'http:// URLs in API calls',
        'server configuration without TLS',
        'missing HSTS headers'
      ],
      severity: 'high'
    },
    evaluation: {
      type: 'pattern_match',
      patterns: [
        'http://[^\\s"\']+',
        'createServer without tls options',
        "headers without 'strict-transport-security'"
      ],
      negatives: [
        'https://',
        'tls.createServer',
        'strict-transport-security'
      ],
      confidence_threshold: 0.90
    },
    education: {
      why: 'Without HTTPS, anyone on the same network can read passwords, tokens, and data in transit.',
      how: 'Use HTTPS everywhere. Enable HSTS. Implement certificate pinning for mobile.',
      failure_example: 'Multiple incidents: Facebook insecure redirects enabled session hijacking via public WiFi.',
      lesson_id: 'lab-tls-01',
      analogy: 'Sending a postcard (HTTP) vs. a sealed envelope (HTTPS) through the mail.'
    },
    fix: {
      available: true,
      fix_type: 'auto_refactor',
      template: 'Replace http:// with https:// in {{url}}',
      variables: ['url']
    },
    tier_behavior: {
      beginner: { action: 'warn', explanation_depth: 'full', requires_acknowledgment: true },
      intermediate: { action: 'warn', explanation_depth: 'summary', requires_acknowledgment: false },
      advanced: { action: 'suggest', explanation_depth: 'none', requires_acknowledgment: false, allow_override: true }
    },
    metadata: {
      version: '1.0.0',
      source: 'OWASP',
      last_updated: '2024-01-01T00:00:00Z',
      tags: ['tls', 'https', 'encryption']
    }
  },
  {
    principle_id: 'error-handling-safe',
    domain: 'security',
    category: 'error_handling',
    tier: 'core',
    enforce_mode: 'prevention',
    rule: {
      name: 'Safe Error Handling',
      description: 'Prevents information leakage through error messages',
      triggers: [
        'stack traces sent to client',
        'sensitive data in error messages',
        'catch blocks that swallow errors silently'
      ],
      severity: 'medium'
    },
    evaluation: {
      type: 'ast_walk',
      patterns: [
        'res.send(err.stack)',
        'res.json({error: err})',
        'catch block with empty body'
      ],
      negatives: [
        'generic error messages to client',
        'structured logging with correlation IDs',
        'error monitoring integration (Sentry, etc.)'
      ],
      confidence_threshold: 0.85
    },
    education: {
      why: 'Error messages reveal database structure, file paths, and library versions to attackers.',
      how: 'Send generic errors to users. Log detailed errors securely with correlation IDs.',
      failure_example: 'Various: Stack traces revealing internal architecture → targeted attacks.',
      lesson_id: 'lab-error-01',
      analogy: "A bank robber asking 'Is the safe behind the painting?' and the guard answering 'Yes, and the code is 1234.'"
    },
    fix: {
      available: true,
      fix_type: 'auto_refactor',
      template: "res.status(500).json({error: 'Internal server error', correlationId: req.id}); logger.error(err, {reqId: req.id});",
      variables: []
    },
    tier_behavior: {
      beginner: { action: 'warn', explanation_depth: 'full', requires_acknowledgment: true },
      intermediate: { action: 'warn', explanation_depth: 'summary', requires_acknowledgment: false },
      advanced: { action: 'suggest', explanation_depth: 'none', requires_acknowledgment: false, allow_override: true }
    },
    metadata: {
      version: '1.0.0',
      source: 'OWASP',
      last_updated: '2024-01-01T00:00:00Z',
      tags: ['error-handling', 'information-leakage']
    }
  },
  {
    principle_id: 'api-broken-object-level-auth',
    domain: 'security',
    category: 'api_security',
    tier: 'core',
    enforce_mode: 'verification',
    rule: {
      name: 'API Broken Object Level Authorization',
      description: 'Detects missing resource ownership checks in API endpoints',
      triggers: [
        'route parameters referencing resources by ID',
        'missing authorization checks on resource access'
      ],
      severity: 'critical'
    },
    evaluation: {
      type: 'ast_walk',
      patterns: [
        "route('/:id') without auth middleware",
        'database query by ID without user ownership check'
      ],
      negatives: [
        'authorization middleware before route handler',
        'query includes user_id filter'
      ],
      confidence_threshold: 0.85
    },
    education: {
      why: 'Attackers can access any resource by changing IDs in URLs (e.g., /api/orders/123 → /api/orders/124).',
      how: 'Verify the authenticated user owns the requested resource before returning data.',
      failure_example: "Uber 2014: Driver IDs enumerable → access to any driver's personal data.",
      lesson_id: 'lab-bola-01',
      analogy: 'A hotel where room numbers are sequential and anyone can enter any room by guessing the number.'
    },
    fix: {
      available: true,
      fix_type: 'template_injection',
      template: 'Add ownership check: WHERE user_id = {{auth_user_id}} AND id = {{resource_id}}',
      variables: ['auth_user_id', 'resource_id']
    },
    tier_behavior: {
      beginner: { action: 'block', explanation_depth: 'full', requires_acknowledgment: true },
      intermediate: { action: 'warn', explanation_depth: 'summary', requires_acknowledgment: false },
      advanced: { action: 'warn', explanation_depth: 'none', requires_acknowledgment: false, allow_override: true }
    },
    metadata: {
      version: '1.0.0',
      source: 'OWASP API Security',
      last_updated: '2024-01-01T00:00:00Z',
      tags: ['api', 'authorization', 'bola']
    }
  },
  {
    principle_id: 'api-excessive-data-exposure',
    domain: 'security',
    category: 'api_security',
    tier: 'core',
    enforce_mode: 'prevention',
    rule: {
      name: 'API Excessive Data Exposure',
      description: 'Prevents APIs from returning more data than necessary',
      triggers: [
        'SELECT * queries returning to client',
        'ORM queries without field exclusion',
        'nested object serialization without filtering'
      ],
      severity: 'high'
    },
    evaluation: {
      type: 'ast_walk',
      patterns: [
        'SELECT * FROM',
        'findOne() without attributes/fields option',
        'res.json(user) where user contains password_hash'
      ],
      negatives: [
        'explicit field selection in queries',
        'DTO/serializer patterns',
        'projection/filter in response'
      ],
      confidence_threshold: 0.85
    },
    education: {
      why: 'APIs often return more data than the client needs, exposing internal fields like password hashes or SSNs.',
      how: 'Use Data Transfer Objects (DTOs). Explicitly select fields in queries. Filter responses.',
      failure_example: 'Various: APIs returning full user objects including hashed passwords.',
      lesson_id: 'lab-data-exp-01',
      analogy: 'A waiter bringing the entire kitchen inventory when you just asked for the menu.'
    },
    fix: {
      available: true,
      fix_type: 'auto_refactor',
      template: 'const {{dto_name}} = { id: {{entity}}.id, name: {{entity}}.name }; res.json({{dto_name}});',
      variables: ['dto_name', 'entity']
    },
    tier_behavior: {
      beginner: { action: 'warn', explanation_depth: 'full', requires_acknowledgment: true },
      intermediate: { action: 'warn', explanation_depth: 'summary', requires_acknowledgment: false },
      advanced: { action: 'suggest', explanation_depth: 'none', requires_acknowledgment: false, allow_override: true }
    },
    metadata: {
      version: '1.0.0',
      source: 'OWASP API Security',
      last_updated: '2024-01-01T00:00:00Z',
      tags: ['api', 'data-exposure']
    }
  },
  {
    principle_id: 'api-rate-limiting',
    domain: 'security',
    category: 'api_security',
    tier: 'core',
    enforce_mode: 'verification',
    rule: {
      name: 'API Rate Limiting',
      description: 'Checks for rate limiting on API endpoints',
      triggers: [
        'route definitions without rate limiting middleware',
        'authentication endpoints without brute force protection'
      ],
      severity: 'high'
    },
    evaluation: {
      type: 'config_audit',
      patterns: [
        'express app without rateLimit middleware',
        'auth routes without express-rate-limit or similar'
      ],
      negatives: [
        'rateLimit() in middleware chain',
        'express-rate-limit configuration',
        'nginx/cloudflare rate limiting'
      ],
      confidence_threshold: 0.80
    },
    education: {
      why: 'Without rate limiting, attackers can brute force passwords, scrape data, or DDoS your API cheaply.',
      how: 'Implement per-IP and per-user rate limits. Stricter limits on auth endpoints.',
      failure_example: 'Various: Unprotected login APIs → credential stuffing attacks at scale.',
      lesson_id: 'lab-rate-limit-01',
      analogy: 'A bank with no queue system — one person could monopolize all tellers forever.'
    },
    fix: {
      available: true,
      fix_type: 'template_injection',
      template: "app.use('/api/', rateLimit({windowMs: 15*60*1000, max: 100}));",
      variables: ['route_prefix']
    },
    tier_behavior: {
      beginner: { action: 'warn', explanation_depth: 'full', requires_acknowledgment: true },
      intermediate: { action: 'warn', explanation_depth: 'summary', requires_acknowledgment: false },
      advanced: { action: 'suggest', explanation_depth: 'none', requires_acknowledgment: false, allow_override: true }
    },
    metadata: {
      version: '1.0.0',
      source: 'OWASP API Security',
      last_updated: '2024-01-01T00:00:00Z',
      tags: ['api', 'rate-limiting', 'ddos']
    }
  },
  {
    principle_id: 'mobile-secure-storage',
    domain: 'security',
    category: 'mobile_security',
    tier: 'core',
    enforce_mode: 'prevention',
    rule: {
      name: 'Mobile Secure Storage',
      description: 'Ensures sensitive data uses platform secure storage',
      triggers: [
        'localStorage/sessionStorage for tokens',
        'SharedPreferences without encryption',
        'NSUserDefaults for sensitive data'
      ],
      severity: 'high'
    },
    evaluation: {
      type: 'pattern_match',
      patterns: [
        "localStorage.setItem('token'",
        'SharedPreferences.*putString.*password',
        'NSUserDefaults.*setObject.*secret'
      ],
      negatives: [
        'Keychain.setGenericPassword',
        'EncryptedSharedPreferences',
        'KeyStore/Keychain usage'
      ],
      confidence_threshold: 0.90
    },
    education: {
      why: 'Mobile devices are lost, stolen, and rooted. Local storage is easily extracted.',
      how: 'Use platform secure storage: iOS Keychain, Android Keystore/EncryptedSharedPreferences.',
      failure_example: 'Various: Apps storing OAuth tokens in localStorage → token theft on rooted devices.',
      lesson_id: 'lab-mobile-storage-01',
      analogy: 'Keeping cash in a desk drawer vs. a bank vault.'
    },
    fix: {
      available: true,
      fix_type: 'auto_refactor',
      template: "await Keychain.setGenericPassword('token', {{token_value}});",
      variables: ['token_value']
    },
    tier_behavior: {
      beginner: { action: 'block', explanation_depth: 'full', requires_acknowledgment: true },
      intermediate: { action: 'warn', explanation_depth: 'summary', requires_acknowledgment: false },
      advanced: { action: 'suggest', explanation_depth: 'none', requires_acknowledgment: false, allow_override: true }
    },
    metadata: {
      version: '1.0.0',
      source: 'OWASP MASVS',
      last_updated: '2024-01-01T00:00:00Z',
      tags: ['mobile', 'storage', 'encryption']
    }
  },
  {
    principle_id: 'mobile-certificate-pinning',
    domain: 'security',
    category: 'mobile_security',
    tier: 'extensible',
    enforce_mode: 'verification',
    rule: {
      name: 'Mobile Certificate Pinning',
      description: 'Checks for certificate pinning in mobile apps',
      triggers: [
        'network requests without certificate validation config',
        'allowsArbitraryLoads in iOS plist',
        'cleartextTrafficPermitted in Android manifest'
      ],
      severity: 'medium'
    },
    evaluation: {
      type: 'config_audit',
      patterns: [
        'allowsArbitraryLoads = true',
        'cleartextTrafficPermitted = true',
        'fetch/axios without certificate pinning'
      ],
      negatives: [
        'SSL pinning configuration',
        'certificate hash validation',
        'TrustKit/OkHttp pinning'
      ],
      confidence_threshold: 0.80
    },
    education: {
      why: 'Without pinning, attackers can use fake certificates on compromised networks to intercept traffic.',
      how: "Pin your server's certificate hash. Use TrustKit (iOS) or OkHttp CertificatePinner (Android).",
      failure_example: 'Various: Banking apps without pinning → man-in-the-middle attacks on public WiFi.',
      lesson_id: 'lab-pinning-01',
      analogy: "A bouncer who checks IDs but doesn't verify if the ID is fake."
    },
    fix: {
      available: true,
      fix_type: 'template_injection',
      template: 'Configure TrustKit/OkHttp with pinned certificate hash for {{domain}}',
      variables: ['domain']
    },
    tier_behavior: {
      beginner: { action: 'suggest', explanation_depth: 'full', requires_acknowledgment: false },
      intermediate: { action: 'warn', explanation_depth: 'summary', requires_acknowledgment: false },
      advanced: { action: 'suggest', explanation_depth: 'none', requires_acknowledgment: false, allow_override: true }
    },
    metadata: {
      version: '1.0.0',
      source: 'OWASP MASVS',
      last_updated: '2024-01-01T00:00:00Z',
      tags: ['mobile', 'certificate-pinning', 'tls']
    }
  },
  {
    principle_id: 'infra-least-privilege-iam',
    domain: 'security',
    category: 'cloud_security',
    tier: 'core',
    enforce_mode: 'verification',
    rule: {
      name: 'Infrastructure Least Privilege IAM',
      description: 'Ensures IAM policies follow principle of least privilege',
      triggers: [
        'IAM policies with * permissions',
        'root account usage',
        'missing MFA on admin accounts'
      ],
      severity: 'high'
    },
    evaluation: {
      type: 'config_audit',
      patterns: [
        "Action: '*' in IAM JSON",
        "Effect: 'Allow' with Resource: '*'",
        'root account access keys'
      ],
      negatives: [
        'principle of least privilege policies',
        'role-based access with specific actions',
        'MFA enforcement conditions'
      ],
      confidence_threshold: 0.90
    },
    education: {
      why: 'Overly permissive IAM is the #1 cause of cloud data breaches. One compromised key owns everything.',
      how: 'Grant only required actions on specific resources. Use roles, not users. Enable MFA everywhere.',
      failure_example: 'Capital One 2019: Overly permissive WAF IAM role → 100M customer records exposed.',
      lesson_id: 'lab-iam-01',
      analogy: 'Giving every employee a master key to the entire building instead of keys to their own office.'
    },
    fix: {
      available: true,
      fix_type: 'suggestion',
      template: "Replace Action: '*' with specific actions: ['s3:GetObject'] for Resource: 'arn:aws:s3:::{{bucket}}'",
      variables: ['bucket']
    },
    tier_behavior: {
      beginner: { action: 'warn', explanation_depth: 'full', requires_acknowledgment: true },
      intermediate: { action: 'warn', explanation_depth: 'summary', requires_acknowledgment: false },
      advanced: { action: 'suggest', explanation_depth: 'none', requires_acknowledgment: false, allow_override: true }
    },
    metadata: {
      version: '1.0.0',
      source: 'CIS Benchmarks',
      last_updated: '2024-01-01T00:00:00Z',
      tags: ['iam', 'cloud', 'least-privilege']
    }
  },
  {
    principle_id: 'infra-state-management',
    domain: 'security',
    category: 'infrastructure',
    tier: 'core',
    enforce_mode: 'verification',
    rule: {
      name: 'Infrastructure State Management',
      description: 'Ensures secure Terraform state management',
      triggers: [
        'Terraform without remote state',
        'state files in version control',
        'unencrypted state storage'
      ],
      severity: 'high'
    },
    evaluation: {
      type: 'config_audit',
      patterns: [
        "terraform { backend 'local' }",
        '*.tfstate in .gitignore missing',
        "backend 's3' without encryption = true"
      ],
      negatives: [
        'remote backend with encryption',
        'state locking enabled',
        'Terraform Cloud/Enterprise backend'
      ],
      confidence_threshold: 0.85
    },
    education: {
      why: 'Terraform state contains all resource configs and often secrets. Local state is lost; VCS state is exposed.',
      how: 'Use remote backend (S3 with encryption + DynamoDB locking, or Terraform Cloud).',
      failure_example: 'Various: tfstate in GitHub → full infrastructure credentials exposed.',
      lesson_id: 'lab-tfstate-01',
      analogy: 'Keeping the blueprint to your vault inside the vault, unlocked.'
    },
    fix: {
      available: true,
      fix_type: 'template_injection',
      template: 'Configure S3 backend with encryption and DynamoDB locking for {{project}}',
      variables: ['project']
    },
    tier_behavior: {
      beginner: { action: 'warn', explanation_depth: 'full', requires_acknowledgment: true },
      intermediate: { action: 'warn', explanation_depth: 'summary', requires_acknowledgment: false },
      advanced: { action: 'suggest', explanation_depth: 'none', requires_acknowledgment: false, allow_override: true }
    },
    metadata: {
      version: '1.0.0',
      source: 'CIS Benchmarks',
      last_updated: '2024-01-01T00:00:00Z',
      tags: ['terraform', 'state', 'infrastructure']
    }
  }
];