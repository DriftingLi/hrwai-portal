import { describe, expect, it } from 'vitest'
import { materialForNode } from '../forklift/model'

describe('forklift material mapping', () => {
  it('maps structural parts by node name', () => {
    expect(materialForNode('Fork blade', 'black')).toBe('forkSteel')
    expect(materialForNode('Fork upright.001', 'black')).toBe('forkSteel')
    expect(materialForNode('Carriage', 'steel')).toBe('forkSteel')
    expect(materialForNode('Seat cushion', 'black')).toBe('leather')
    expect(materialForNode('Seat back', 'black')).toBe('leather')
    expect(materialForNode('Overhead guard rail', 'steel')).toBe('guardMetal')
    expect(materialForNode('Outer mast', 'steel')).toBe('guardMetal')
    expect(materialForNode('Inner mast.001', 'chrome')).toBe('guardMetal')
    expect(materialForNode('Counterweight', 'orange')).toBe('paint')
    expect(materialForNode('Battery compartment', 'orange')).toBe('paint')
    expect(materialForNode('Chassis', 'black')).toBe('chassis')
    expect(materialForNode('Foot platform', 'steel')).toBe('chassis')
    expect(materialForNode('Lift chain', 'black')).toBe('chainSteel')
    expect(materialForNode('Lift rod', 'chrome')).toBe('chrome')
    expect(materialForNode('Tilt rod.001', 'chrome')).toBe('chrome')
    expect(materialForNode('Lift cylinder', 'steel')).toBe('guardMetal')
    expect(materialForNode('Lever knob', 'black')).toBe('hazardYellow')
    expect(materialForNode('Control lever', 'chrome')).toBe('chrome')
  })

  it('distinguishes the rear wheels from the actual steering wheel', () => {
    // 原模型把后轮命名为 Steering wheel_*，真正的方向盘叫 Steering wheel
    expect(materialForNode('Steering wheel_tire', 'rubber')).toBe('rubber')
    expect(materialForNode('Steering wheel_rim', 'chrome')).toBe('rimSteel')
    expect(materialForNode('Steering wheel_spoke.003', 'chrome')).toBe('rimSteel')
    expect(materialForNode('Steering wheel_hub', 'chrome')).toBe('chrome')
    expect(materialForNode('Steering wheel_brake', 'steel')).toBe('brake')
    expect(materialForNode('Steering wheel', 'black')).toBe('blackPlastic')
    expect(materialForNode('Steering column', 'black')).toBe('blackPlastic')
  })

  it('handles GLTFLoader sanitized names (spaces become underscores)', () => {
    expect(materialForNode('Drive_wheel_rim', 'chrome')).toBe('rimSteel')
    expect(materialForNode('Drive_wheel_spoke001', 'chrome')).toBe('rimSteel')
    expect(materialForNode('Drive_wheel_hub', 'chrome')).toBe('chrome')
    expect(materialForNode('Steering_wheel_tire', 'rubber')).toBe('rubber')
    expect(materialForNode('Steering_wheel_rim', 'chrome')).toBe('rimSteel')
    expect(materialForNode('Steering_wheel', 'black')).toBe('blackPlastic')
    expect(materialForNode('Battery_compartment', 'orange')).toBe('paint')
    expect(materialForNode('Overhead_guard_rail', 'steel')).toBe('guardMetal')
    expect(materialForNode('Outer_mast', 'steel')).toBe('guardMetal')
    expect(materialForNode('Lift_chain', 'black')).toBe('chainSteel')
    expect(materialForNode('Lever_knob', 'black')).toBe('hazardYellow')
    expect(materialForNode('Foot_platform', 'steel')).toBe('chassis')
    expect(materialForNode('Fork_blade', 'black')).toBe('forkSteel')
    expect(materialForNode('Seat_cushion', 'black')).toBe('leather')
    expect(materialForNode('Steering_column', 'black')).toBe('blackPlastic')
  })

  it('falls back to the original material family', () => {
    expect(materialForNode('Some unknown part', 'orange')).toBe('paint')
    expect(materialForNode('Some unknown part', 'steel')).toBe('guardMetal')
    expect(materialForNode('Some unknown part', 'black')).toBe('blackPlastic')
    expect(materialForNode('Some unknown part', 'chrome')).toBe('chrome')
    expect(materialForNode('Some unknown part', 'rubber')).toBe('rubber')
  })
})
