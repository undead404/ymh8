import si from 'systeminformation';

// Define operational hardware boundaries.
// Adjust these based on the specific TJMax of your CPU architecture.
const MAX_SAFE_TEMPERATURE_CELSIUS = 65;
const MAX_CPU_LOAD_PERCENTAGE = 40;

export interface SystemHealth {
  isThermallyThrottled: boolean;
  isCpuSaturated: boolean;
  metrics: {
    temperatureCelsius: number | null;
    loadPercentage: number;
  };
}

/**
 * Polls OS-level hardware sensors to determine if the host machine
 * has exceeded safe thermal or computational thresholds.
 */
export default async function checkSystemHealth(): Promise<SystemHealth> {
  // Dispatch OS system calls concurrently to minimize telemetry latency
  const [temporaryData, loadData] = await Promise.all([
    si.cpuTemperature(),
    si.currentLoad(),
  ]);

  // Extract the highest reported temperature across all available cores/zones.
  // Fallback to 'main' if 'max' is not populated by the specific motherboard sensor.
  const currentTemporary =
    temporaryData.max === null ? temporaryData.main : temporaryData.max;
  const currentLoad = loadData.currentLoad;

  return {
    isThermallyThrottled:
      currentTemporary !== null &&
      currentTemporary > MAX_SAFE_TEMPERATURE_CELSIUS,
    isCpuSaturated: currentLoad > MAX_CPU_LOAD_PERCENTAGE,
    metrics: {
      temperatureCelsius: currentTemporary,
      loadPercentage: currentLoad,
    },
  };
}
