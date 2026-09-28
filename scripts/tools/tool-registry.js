/* Designed by Kapil Pidhwani: Central Declarative Registry for Toolity.in Micro-Tools */

export const CATEGORIES = [
  { id: 'all', label: 'All Tools', icon: '✨' },
  { id: 'formatters', label: 'Formatters & Beautifiers', icon: '🧹' },
  { id: 'converters', label: 'Converters', icon: '🔄' },
  { id: 'generators', label: 'Generators', icon: '⚙️' },
  { id: 'crypto', label: 'Crypto & Hash', icon: '🔒' },
  { id: 'text', label: 'Text & Content', icon: '📝' }
];

export const TOOL_REGISTRY = [
  {
    id: 'json-formatter',
    title: 'JSON Formatter & Validator',
    description: 'Clean, format, beautify, and validate JSON data instantly with tree inspection.',
    category: 'formatters',
    icon: '{ }',
    tags: ['json', 'format', 'prettify', 'validate', 'minify'],
    isPopular: true
  },
  {
    id: 'base64-encoder',
    title: 'Base64 Encoder / Decoder',
    description: 'Convert strings, files, and images to/from Base64 format with 100% client-side security.',
    category: 'converters',
    icon: '🔤',
    tags: ['base64', 'encode', 'decode', 'binary', 'string'],
    isPopular: true
  },
  {
    id: 'hash-generator',
    title: 'Hash Generator (MD5, SHA-256)',
    description: 'Generate cryptographic hash digests securely directly in your browser.',
    category: 'crypto',
    icon: '🔐',
    tags: ['hash', 'sha256', 'md5', 'sha512', 'crypto'],
    isPopular: false
  },
  {
    id: 'uuid-generator',
    title: 'UUID / GUID Generator',
    description: 'Generate bulk cryptographically random v4 UUIDs for databases and APIs.',
    category: 'generators',
    icon: '🆔',
    tags: ['uuid', 'guid', 'v4', 'random', 'generator'],
    isPopular: true
  },
  {
    id: 'url-encoder',
    title: 'URL Encoder / Decoder',
    description: 'Safely encode and decode query parameters and URI components.',
    category: 'converters',
    icon: '🔗',
    tags: ['url', 'uri', 'encode', 'decode', 'params'],
    isPopular: false
  },
  {
    id: 'word-counter',
    title: 'Word & Character Counter',
    description: 'Analyze text statistics, word density, readability score, and character counts.',
    category: 'text',
    icon: '📊',
    tags: ['word', 'count', 'characters', 'reading time', 'text'],
    isPopular: false
  }
];
