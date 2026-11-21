'use strict';
// Havacılık ve RC / İHA (insansız hava aracı) terimleri: Kelime Testinde ✈ işareti için.
// Genel bilgisayar ve arayüz sözcükleri (kaydet, dosya, sil…) bilerek dışarıda bırakıldı.
window.AVIATION_TERMS = [
  // uçuş ve aerodinamik
  'abort', 'aerodynamics', 'aerobatics', 'air', 'airborne', 'airspeed', 'air speed', 'indicated airspeed', 'true airspeed', 'airfoil', 'aerofoil',
  'angle of attack', 'attitude', 'altitude', 'absolute altitude', 'relative altitude', 'approach', 'final approach', 'go around', 'go-around',
  'bank', 'bank angle', 'banking', 'climb', 'climb rate', 'rate of climb', 'cruise', 'cruising', 'cruise speed', 'descent', 'descend', 'dive',
  'drag', 'lift', 'thrust', 'weight', 'center of gravity', 'centre of gravity', 'cg', 'stall', 'stall speed', 'spin', 'glide', 'glider', 'gliding',
  'heading', 'course', 'bearing', 'pitch', 'roll', 'yaw', 'axis', 'horizon', 'artificial horizon', 'attitude indicator', 'inverted', 'inverted flight',
  'land', 'landing', 'touchdown', 'flare', 'takeoff', 'take off', 'take-off', 'launch', 'hand launch', 'catapult', 'runway', 'taxi', 'taxiing',
  'flight', 'fly', 'flying', 'flight plan', 'flight mode', 'flight controller', 'flight management unit', 'flight time', 'level flight', 'hover', 'hovering',
  'loiter', 'loitering', 'circle', 'orbit', 'turn', 'turns', 'coordinated turn', 'nose', 'nose down', 'nose up', 'tail', 'tailwind', 'headwind', 'crosswind',
  'wind', 'wind speed', 'gust', 'turbulence', 'over speed', 'overspeed', 'ground speed', 'groundspeed', 'vertical speed', 'sink', 'sink rate',
  'terrain', 'terrain following', 'elevation', 'elevation graph', 'ceiling', 'visibility', 'transition', 'tilt', 'tilt rotor', 'vtol', 'stol',
  'total energy control system', 'tecs', 'stabilize', 'stabilise', 'stabilization', 'stabilizer', 'trim', 'trimming', 'damping', 'mach',
  // gövde ve kumanda yüzeyleri
  'aircraft', 'airplane', 'aeroplane', 'plane', 'airframe', 'fuselage', 'wing', 'wingspan', 'wing loading', 'flying wing', 'delta wing',
  'aileron', 'elevator', 'elevon', 'rudder', 'ruddervator', 'v-tail', 'flap', 'flaps', 'flaperon', 'spoiler', 'slat', 'canard', 'fin',
  'horizontal stabilizer', 'vertical stabilizer', 'empennage', 'landing gear', 'gear', 'retract', 'retracted', 'retractable', 'undercarriage',
  'control surface', 'control surfaces', 'control horn', 'pushrod', 'linkage', 'hinge', 'cockpit', 'canopy', 'nacelle', 'pylon', 'boom',
  'seaplane', 'float plane', 'floatplane', 'jet', 'jet fighters', 'fighter', 'helicopter', 'heli', 'rotor', 'main rotor', 'tail rotor', 'swashplate',
  'copter', 'multicopter', 'multirotor', 'quadcopter', 'hexacopter', 'octocopter', 'drone', 'uav', 'uas', 'unmanned aerial vehicle', 'rpas',
  'fixed wing', 'fixed-wing', 'balloon', 'balloon burst', 'parachute', 'blimp', 'airship', 'rover', 'vehicle', 'payload', 'bomb', 'drop',
  // motor ve güç
  'engine', 'motor', 'brushless', 'brushless motor', 'brushed motor', 'outrunner', 'inrunner', 'kv', 'propeller', 'prop', 'props', 'propeller pitch',
  'spinner', 'shaft', 'esc', 'electronic speed controller', 'speed controller', 'throttle', 'throttle curve', 'idle', 'rpm', 'tachometer', 'ignition',
  'glow plug', 'fuel', 'fuel tank', 'turbine', 'edf', 'ducted fan', 'fan', 'exhaust', 'battery', 'batteries', 'lipo', 'li-ion', 'cell', 'cells',
  'charge', 'charger', 'discharge', 'discharge rate', 'c rating', 'balance', 'balance charger', 'balancer', 'mah', 'capacity', 'voltage', 'volt',
  'ampere', 'amp', 'current', 'current sensor', 'watt', 'power module', 'bec', 'ubec', 'power distribution board', 'pdb', 'power off', 'power on',
  // kumanda, alıcı-verici, telsiz
  'radio', 'radio control', 'rc', 'transmitter', 'receiver', 'tx', 'rx', 'bind', 'binding', 'channel', 'channels', 'aux', 'auxiliary', 'auxiliary channel',
  'stick', 'sticks', 'gimbal', 'joystick', 'switch', 'trim', 'dual rate', 'dual rates', 'expo', 'exponential', 'mix', 'mixing', 'mixer', 'reverse',
  'servo', 'servos', 'servo motor', 'servo arm', 'servo reverse', 'endpoint', 'end point', 'subtrim', 'pwm', 'ppm', 'sbus', 'pulse-width modulation',
  'pulse width modulation', 'failsafe', 'fail safe', 'fail-safe', 'range check', 'long range', 'antenna', 'antenna tracker', 'telemetry', 'telemetry radio',
  'frequency', 'band', 'narrow band', 'modulation', 'signal', 'signal strength', 'rssi', 'link', 'radio link', 'downlink', 'uplink', 'jamming', 'jammer',
  'spoofing', 'interference', 'line of sight', 'los', 'bvlos', 'vlos', 'baud rate', 'mavlink', 'protocol', 'encryption', 'signing',
  'video transmitter', 'video receiver', 'vtx', 'vrx', 'fpv', 'first person view', 'osd', 'on screen display', 'camera', 'shutter', 'gimbal', 'pan', 'tilt',
  // otopilot, sensörler, navigasyon
  'autopilot', 'auto pilot', 'pixhawk', 'ardupilot', 'arduplane', 'arducopter', 'px4', 'mission planner', 'qgroundcontrol', 'ground control station',
  'gcs', 'ground station', 'flight controller', 'fc', 'imu', 'inertial measurement unit', 'accelerometer', 'gyro', 'gyroscope', 'magnetometer', 'compass',
  'barometer', 'altimeter', 'airspeed sensor', 'pitot', 'pitot tube', 'static port', 'pressure difference', 'differential pressure', 'anemometer',
  'optical flow', 'rangefinder', 'lidar', 'sonar', 'radar', 'gps', 'gnss', 'rtk', 'satellite', 'satellites', 'sat', 'geosynchronous', 'fix', '3d fix',
  'hdop', 'navigation', 'navigate', 'waypoint', 'waypoints', 'mission', 'route', 'path', 'geofence', 'fence', 'home', 'home position', 'go home',
  'return to launch', 'return to home', 'return to', 'rtl', 'rth', 'auto', 'auto mode', 'manual', 'manual mode', 'fbwa', 'fly by wire', 'fly-by-wire',
  'acro', 'stabilize mode', 'alt hold', 'altitude hold', 'position hold', 'poshold', 'guided', 'cruise mode', 'qloiter', 'qhover', 'qland', 'qrtl',
  'latitude', 'longitude', 'azimuth', 'heading hold', 'north', 'south', 'east', 'west', 'magnetic north', 'true north', 'declination',
  'military grid reference system', 'mgrs', 'universal transverse mercator', 'utm', 'shuttle radar topography mission', 'srtm', 'grid',
  'calibrate', 'calibration', 'calibrate ratio', 'relaxed calibration', 'strict calibration', 'very strict calibration', 'level calibration',
  'arm', 'arming', 'armed', 'disarm', 'disarming', 'disarmed', 'preflight', 'pre-flight', 'preflight check', 'postflight', 'checklist',
  'pid', 'proportional', 'integral', 'derivative', 'gain', 'gains', 'tuning', 'autotune', 'vibration', 'slew rate', 'feed back', 'feedback',
  'hall effect', 'parameters', 'firmware', 'flight log', 'log', 'logging', 'dataflash', 'black box', 'blackbox', 'simulation', 'simulator', 'sitl',
  'rings race', 'race', 'racing', 'meters per second', 'knot', 'knots', 'feet', 'nautical mile', 'airfield', 'airport', 'airspace', 'notam',
  'atc', 'air traffic control', 'pilot', 'copilot', 'co-pilot', 'observer', 'pilot in command', 'crash', 'crash landing', 'emergency', 'mayday',
  'brake', 'brakes', 'wheel brake', 'controller', 'speed', 'sensor', 'sensors', 'velocity', 'height', 'ground', 'angle', 'gauge', 'fuel gauge',
  'indicator', 'planner', 'model', 'rc model', 'model aircraft', 'hybrid', 'failure', 'engine failure', 'motor failure',
  // tabloda iki satıra bölünmüş uzun terimlerin parçaları
  'military grid', 'reference system', 'shuttle radar', 'topography mission', 'universal', 'transverse mercator', 'total energy', 'control system',
  'on board', 'onboard', 'marine', 'earth ground', 'override', 'flight termination', 'buzzer', 'safety switch', 'safety',
];
(function () {
  const set = new Set(window.AVIATION_TERMS.map((w) => w.toLowerCase()));
  const norm = (s) => String(s || '').toLowerCase().replace(/^\s*\((.*)\)\s*$/, '$1').replace(/\(.*?\)/g, ' ').replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim().replace(/^to /, '').replace(/[.!?;:,]+$/, '');
  const variants = (w) => {
    const c = [w, w.replace(/-/g, ' '), w.replace(/ /g, '')];
    if (w.endsWith('ies')) c.push(w.slice(0, -3) + 'y');
    if (w.endsWith('es')) c.push(w.slice(0, -2));
    if (w.endsWith('s')) c.push(w.slice(0, -1));
    if (w.endsWith('ing')) c.push(w.slice(0, -3), w.slice(0, -3) + 'e');
    if (w.endsWith('ed')) c.push(w.slice(0, -2), w.slice(0, -1));
    return c;
  };
  window.isAviationTerm = (term) => {
    const w = norm(term);
    if (!w || w.length > 60) return false;
    return variants(w).some((v) => set.has(v));
  };
})();
