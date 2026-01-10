/**
 * Chapter 5: MCP Server (通用协议模拟 - 服务端)
 * 目标：理解 Model Context Protocol (MCP) 的 Server 端设计。
 *
 * 核心要点：
 * 1. 创建一个标准化的 Server 类
 * 2. 实现 listTools() 返回工具列表
 * 3. 实现 call() 执行具体工具
 * 4. 这种设计实现了"能力声明"与"能力调用"的解耦
 *
 * @module 01-runtime-lab/05-mcp-server
 * [INPUT]: zod (参数校验)
 * [OUTPUT]: export { MapServer } - MCP Server 实现类，供 06-mcp-client 消费
 * [POS]: Runtime Lab 第五章，MCP 协议服务端，与 06-mcp-client 配对使用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { z } from 'zod';

// ============================================
// MCP 协议类型定义
// ============================================

// 工具定义接口
interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

// JSON-RPC 风格的请求
interface MCPRequest {
  method: string;
  params?: Record<string, unknown>;
}

// JSON-RPC 风格的响应
interface MCPResponse {
  result?: unknown;
  error?: { code: number; message: string };
}

// ============================================
// 高德地图 MCP Server 实现
// ============================================

export class MapServer {
  private name = 'amap-server';
  private version = '1.0.0';

  // 定义工具的参数 Schema
  private schemas = {
    getLocation: z.object({
      address: z.string().describe('地址名称，如 "北京天安门"'),
    }),
    getWeather: z.object({
      city: z.string().describe('城市名称，如 "北京"'),
    }),
    getRoute: z.object({
      origin: z.string().describe('起点地址'),
      destination: z.string().describe('终点地址'),
    }),
  };

  /**
   * 返回服务器信息（握手协议）
   */
  getServerInfo() {
    return {
      name: this.name,
      version: this.version,
      capabilities: ['tools'],
    };
  }

  /**
   * 列出所有可用工具（能力声明）
   * 这就是 MCP 协议的核心：Server 告诉 Client 自己能做什么
   */
  listTools(): ToolDefinition[] {
    return [
      {
        name: 'getLocation',
        description: '根据地址获取经纬度坐标',
        parameters: {
          type: 'object',
          properties: {
            address: { type: 'string', description: '地址名称' },
          },
          required: ['address'],
        },
      },
      {
        name: 'getWeather',
        description: '获取城市天气信息',
        parameters: {
          type: 'object',
          properties: {
            city: { type: 'string', description: '城市名称' },
          },
          required: ['city'],
        },
      },
      {
        name: 'getRoute',
        description: '获取两地之间的路线规划',
        parameters: {
          type: 'object',
          properties: {
            origin: { type: 'string', description: '起点地址' },
            destination: { type: 'string', description: '终点地址' },
          },
          required: ['origin', 'destination'],
        },
      },
    ];
  }

  /**
   * 执行工具调用（能力调用）
   * 这里模拟高德 API 的返回，实际项目中会调用真实 API
   */
  call(request: MCPRequest): MCPResponse {
    const { method, params = {} } = request;

    try {
      switch (method) {
        case 'getLocation': {
          const { address } = this.schemas.getLocation.parse(params);
          // 模拟 API 返回
          return {
            result: {
              address,
              location: {
                lng: 116.397428 + Math.random() * 0.1,
                lat: 39.90923 + Math.random() * 0.1,
              },
              formatted_address: `中国北京市${address}`,
            },
          };
        }

        case 'getWeather': {
          const { city } = this.schemas.getWeather.parse(params);
          // 模拟天气数据
          const weathers = ['晴', '多云', '阴', '小雨'];
          return {
            result: {
              city,
              weather: weathers[Math.floor(Math.random() * weathers.length)],
              temperature: Math.floor(Math.random() * 20) + 10,
              humidity: Math.floor(Math.random() * 50) + 30,
            },
          };
        }

        case 'getRoute': {
          const { origin, destination } = this.schemas.getRoute.parse(params);
          // 模拟路线规划
          return {
            result: {
              origin,
              destination,
              distance: `${Math.floor(Math.random() * 50) + 5}公里`,
              duration: `${Math.floor(Math.random() * 60) + 10}分钟`,
              steps: ['出发', '沿主路直行', '到达目的地'],
            },
          };
        }

        default:
          return {
            error: { code: -32601, message: `Method not found: ${method}` },
          };
      }
    } catch (error) {
      return {
        error: {
          code: -32602,
          message: error instanceof Error ? error.message : 'Invalid params',
        },
      };
    }
  }
}

// ============================================
// 演示：单独运行 Server
// ============================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new MapServer();

  console.log('='.repeat(50));
  console.log('  Chapter 5: MCP Server');
  console.log('='.repeat(50));
  console.log('\n服务器信息:');
  console.log(JSON.stringify(server.getServerInfo(), null, 2));

  console.log('\n可用工具列表:');
  console.log(JSON.stringify(server.listTools(), null, 2));

  console.log('\n模拟调用 getLocation:');
  const result1 = server.call({
    method: 'getLocation',
    params: { address: '北京天安门' },
  });
  console.log(JSON.stringify(result1, null, 2));

  console.log('\n模拟调用 getWeather:');
  const result2 = server.call({
    method: 'getWeather',
    params: { city: '上海' },
  });
  console.log(JSON.stringify(result2, null, 2));

  console.log('\n[提示] 这是 MCP Server 的独立演示');
  console.log('[提示] 运行 Chapter 6 查看 Client 如何连接 Server');
}
