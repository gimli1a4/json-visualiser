/**
 * jsonParser.js
 * Converts a JSON string into a GraphNode tree.
 *
 * GraphNode shape:
 * {
 *   id: string,          // path-based: "root", "root.users", "root.users[0]", "root.users[0].name"
 *   key: string,
 *   valueType: 'object'|'array'|'string'|'number'|'boolean'|'null',
 *   value: any,          // null for containers
 *   depth: number,
 *   parentId: string | null,
 *   children: GraphNode[],
 *   position: { x: number, y: number, z: number }  // {0,0,0}; layout fills this
 * }
 */

/**
 * Determine the valueType string for a parsed JSON value.
 * @param {any} value
 * @returns {'object'|'array'|'string'|'number'|'boolean'|'null'}
 */
function getValueType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value; // 'object', 'string', 'number', 'boolean'
}

/**
 * Build a GraphNode (and its children recursively) from a parsed JSON value.
 * @param {string} id      - path-based node id
 * @param {string} key     - the key/index at this level
 * @param {any}    value   - the parsed value
 * @param {number} depth   - current depth (root = 0)
 * @param {string|null} parentId
 * @returns {import('./jsonParser').GraphNode}
 */
function buildNode(id, key, value, depth, parentId) {
  const valueType = getValueType(value);
  const isContainer = valueType === 'object' || valueType === 'array';

  /** @type {GraphNode} */
  const node = {
    id,
    key,
    valueType,
    value: isContainer ? null : value,
    depth,
    parentId,
    children: [],
    position: { x: 0, y: 0, z: 0 },
  };

  if (valueType === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const childId = `${id}.${k}`;
      node.children.push(buildNode(childId, k, v, depth + 1, id));
    }
  } else if (valueType === 'array') {
    for (let i = 0; i < value.length; i++) {
      const childId = `${id}[${i}]`;
      node.children.push(buildNode(childId, String(i), value[i], depth + 1, id));
    }
  }

  return node;
}

/**
 * Parse a JSON string and return the root GraphNode of the tree.
 * Throws a descriptive Error on invalid JSON.
 *
 * @param {string} jsonString
 * @returns {GraphNode}
 */
export function parseJson(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`Invalid JSON: ${err.message}`);
  }

  return buildNode('root', 'root', parsed, 0, null);
}
