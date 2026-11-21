'use strict';
// Yerleşik soru ve senaryo arşivi (internet yokken kullanılır). Çevrimiçi arşiv Firebase'den gelir ve daha yeniyse bunun yerine geçer.
// Seviye: 1 = Öğrenci (temel), 2 = Orta, 3 = İleri.  Konu: uav = İHA / Havacılık, eng = İngilizce.
// Sorularda doğru seçenek her zaman ilk sıradadır; sınava eklenirken seçenekler karıştırılır.
(function () {
  const M = (tr, en, ar) => ({ tr, en, ar: ar == null ? en : ar });
  const same = (s) => ({ tr: s, en: s, ar: s });
  const questions = [];
  const scenarios = [];
  let n = 0;
  // İHA sorusu: q = [tr, en, ar], opts = [[tr, en, ar] x5]
  const Q = (lvl, q, opts) => questions.push({ id: 'u' + (++n), lvl, topic: 'uav', text: M(...q), options: opts.map((o) => (Array.isArray(o) ? M(...o) : same(o))), correct: 0 });
  // İngilizce sorusu: seçenekler her dilde aynı (İngilizce), yalnızca yönerge çevrilir
  const STEM = {
    gap: ['Boşluğa uygun seçeneği işaretleyin:', 'Choose the correct option to fill the gap:', 'اختر الخيار الصحيح لملء الفراغ:'],
    syn: ['"{w}" kelimesine anlamca en yakın olanı seçin.', 'Choose the word closest in meaning to "{w}".', 'اختر الكلمة الأقرب في المعنى إلى "{w}".'],
    opp: ['"{w}" kelimesinin zıt anlamlısını seçin.', 'Choose the opposite of "{w}".', 'اختر عكس كلمة "{w}".'],
  };
  const E = (lvl, kind, s, opts) => {
    const st = STEM[kind].map((x) => x.replace('{w}', s));
    const text = kind === 'gap' ? M(st[0] + '\n' + s, st[1] + '\n' + s, st[2] + '\n' + s) : M(st[0], st[1], st[2]);
    questions.push({ id: 'e' + (++n), lvl, topic: 'eng', text, options: opts.map(same), correct: 0 });
  };

  /* ================= İHA / Havacılık — Öğrenci ================= */
  Q(1, ['"UAV" kısaltmasının açılımı nedir?', 'What does "UAV" stand for?', 'ما المقصود باختصار "UAV"؟'],
    ['Unmanned Aerial Vehicle', 'Universal Air Vehicle', 'Unified Aviation Vehicle', 'Upper Air Velocity', 'Unmanned Automatic Valve']);
  Q(1, ['Uçağın yatış (roll) hareketini hangi kumanda yüzeyi sağlar?', 'Which control surface controls roll?', 'أي سطح تحكم يتحكم في حركة الدوران حول المحور الطولي (Roll)؟'],
    [['Kanatçık (aileron)', 'Aileron', 'الجنيحات (Aileron)'], ['İstikamet dümeni (rudder)', 'Rudder', 'الدفة الاتجاهية (Rudder)'], ['İrtifa dümeni (elevator)', 'Elevator', 'الرافعة (Elevator)'], ['Flap', 'Flap', 'القلابات (Flap)'], ['Pervane', 'Propeller', 'المروحة']]);
  Q(1, ['Uçağın burun yukarı/aşağı (pitch) hareketini hangi yüzey sağlar?', 'Which control surface controls pitch?', 'أي سطح تحكم يتحكم في رفع وخفض مقدمة الطائرة (Pitch)؟'],
    [['İrtifa dümeni (elevator)', 'Elevator', 'الرافعة (Elevator)'], ['Kanatçık (aileron)', 'Aileron', 'الجنيحات (Aileron)'], ['İstikamet dümeni (rudder)', 'Rudder', 'الدفة الاتجاهية (Rudder)'], ['İniş takımı', 'Landing gear', 'عجلات الهبوط'], ['Spoiler', 'Spoiler', 'المفسدات (Spoiler)']]);
  Q(1, ['Uçağın sağa/sola sapma (yaw) hareketini hangi yüzey sağlar?', 'Which control surface controls yaw?', 'أي سطح تحكم يتحكم في الانعراج (Yaw)؟'],
    [['İstikamet dümeni (rudder)', 'Rudder', 'الدفة الاتجاهية (Rudder)'], ['İrtifa dümeni (elevator)', 'Elevator', 'الرافعة (Elevator)'], ['Kanatçık (aileron)', 'Aileron', 'الجنيحات (Aileron)'], ['Flap', 'Flap', 'القلابات (Flap)'], ['Gövde', 'Fuselage', 'جسم الطائرة']]);
  Q(1, ['Uçuşta etkili olan dört temel kuvvet hangileridir?', 'What are the four forces of flight?', 'ما هي القوى الأربع المؤثرة في الطيران؟'],
    [['Taşıma, ağırlık, itki, sürükleme', 'Lift, weight, thrust, drag', 'الرفع، الوزن، الدفع، السحب'], ['Taşıma, hız, güç, ağırlık', 'Lift, speed, power, weight', 'الرفع، السرعة، القدرة، الوزن'], ['İtki, irtifa, hız, rüzgâr', 'Thrust, altitude, speed, wind', 'الدفع، الارتفاع، السرعة، الرياح'], ['Ağırlık, basınç, sıcaklık, nem', 'Weight, pressure, temperature, humidity', 'الوزن، الضغط، الحرارة، الرطوبة'], ['Sürükleme, tork, eylemsizlik, hız', 'Drag, torque, inertia, speed', 'السحب، العزم، القصور الذاتي، السرعة']]);
  Q(1, ['Sürükleme (drag) kuvvetine karşı koyan kuvvet hangisidir?', 'Which force opposes drag?', 'ما القوة التي تعاكس قوة السحب؟'],
    [['İtki', 'Thrust', 'الدفع'], ['Taşıma', 'Lift', 'الرفع'], ['Ağırlık', 'Weight', 'الوزن'], ['Eylemsizlik', 'Inertia', 'القصور الذاتي'], ['Tork', 'Torque', 'العزم']]);
  Q(1, ['Küçük İHA\'larda en yaygın kullanılan batarya türü hangisidir?', 'Which battery type is most common in small drones?', 'ما نوع البطارية الأكثر استخداماً في الطائرات المسيّرة الصغيرة؟'],
    [['Lityum polimer (LiPo)', 'Lithium polymer (LiPo)', 'ليثيوم بوليمر (LiPo)'], ['Kurşun-asit', 'Lead-acid', 'رصاص حمضي'], ['Alkalin', 'Alkaline', 'قلوية'], ['Nikel-kadmiyum (NiCd)', 'Nickel-cadmium (NiCd)', 'نيكل كادميوم (NiCd)'], ['Cıva pil', 'Mercury cell', 'بطارية زئبقية']]);
  Q(1, ['Her uçuştan önce ne yapılmalıdır?', 'What should be done before every flight?', 'ماذا يجب أن يُفعل قبل كل طيران؟'],
    [['Uçuş öncesi kontrol listesi uygulanmalı', 'Complete the pre-flight checklist', 'تنفيذ قائمة الفحص قبل الطيران'], ['Yalnızca kamera temizlenmeli', 'Only clean the camera', 'تنظيف الكاميرا فقط'], ['Batarya tamamen boşaltılmalı', 'Fully discharge the battery', 'تفريغ البطارية بالكامل'], ['Pervaneler sökülmeli', 'Remove the propellers', 'فك المراوح'], ['Kumanda kapalı bırakılmalı', 'Leave the transmitter off', 'ترك جهاز التحكم مطفأً']]);
  Q(1, ['İHA\'da GPS ne için kullanılır?', 'What is GPS used for on a UAV?', 'فيمَ يُستخدم نظام GPS في الطائرة المسيّرة؟'],
    [['Konumu belirlemek için', 'To determine position', 'لتحديد الموقع'], ['İtkiyi artırmak için', 'To increase thrust', 'لزيادة الدفع'], ['Motorları soğutmak için', 'To cool the motors', 'لتبريد المحركات'], ['Bataryayı şarj etmek için', 'To charge the battery', 'لشحن البطارية'], ['Pervane devrini ölçmek için', 'To measure propeller RPM', 'لقياس سرعة دوران المروحة']]);
  Q(1, ['Sabit kanatlı bir uçak tercihen hangi yönde kalkış yapmalıdır?', 'In which direction should a fixed-wing aircraft preferably take off?', 'في أي اتجاه يُفضَّل أن تقلع الطائرة ثابتة الجناح؟'],
    [['Rüzgâra karşı', 'Into the wind', 'عكس اتجاه الرياح'], ['Rüzgârı arkaya alarak', 'With a tailwind', 'مع الرياح من الخلف'], ['Rüzgâra dik', 'Perpendicular to the wind', 'عمودياً على الرياح'], ['Rüzgâr yönü fark etmez', 'Wind direction does not matter', 'اتجاه الرياح لا يهم'], ['Rüzgâr en güçlüyken', 'When the wind is strongest', 'عندما تكون الرياح في أشدها']]);
  Q(1, ['Quadcopter kaç rotorludur?', 'How many rotors does a quadcopter have?', 'كم عدد المراوح في الطائرة الرباعية (Quadcopter)؟'],
    [['Dört', 'Four', 'أربعة'], ['İki', 'Two', 'اثنان'], ['Altı', 'Six', 'ستة'], ['Sekiz', 'Eight', 'ثمانية'], ['Bir', 'One', 'واحد']]);
  Q(1, ['"İrtifa (altitude)" ne demektir?', 'What does "altitude" mean?', 'ماذا يعني مصطلح "الارتفاع (Altitude)"؟'],
    [['Bir referansa (örneğin deniz seviyesine) göre yükseklik', 'Height above a reference (e.g. sea level)', 'الارتفاع بالنسبة لمرجع (مثل مستوى سطح البحر)'], ['Uçuş hızı', 'Flight speed', 'سرعة الطيران'], ['Uçuş yönü', 'Heading', 'اتجاه الطيران'], ['Batarya seviyesi', 'Battery level', 'مستوى البطارية'], ['Kalkış noktasına yatay uzaklık', 'Horizontal distance to home', 'المسافة الأفقية إلى نقطة الإقلاع']]);

  /* ================= İHA / Havacılık — Orta ================= */
  Q(2, ['"Stall (perdövites)" nedir?', 'What is a stall?', 'ما هو الانهيار (Stall)؟'],
    [['Hücum açısı kritik açıyı aşınca taşımanın kaybolması', 'Loss of lift when the angle of attack exceeds the critical angle', 'فقدان الرفع عند تجاوز زاوية الهجوم الزاوية الحرجة'], ['Motorun durması', 'The engine stopping', 'توقف المحرك'], ['Bataryanın bitmesi', 'The battery running out', 'نفاد البطارية'], ['GPS sinyalinin kaybı', 'Loss of GPS signal', 'فقدان إشارة GPS'], ['Aşırı hız', 'Excessive speed', 'السرعة الزائدة']]);
  Q(2, ['Hücum açısı (angle of attack) nedir?', 'What is the angle of attack?', 'ما هي زاوية الهجوم؟'],
    [['Kanat veteri ile bağıl rüzgâr arasındaki açı', 'The angle between the chord line and the relative wind', 'الزاوية بين وتر الجناح والرياح النسبية'], ['Kanat ile gövde arasındaki açı', 'The angle between the wing and the fuselage', 'الزاوية بين الجناح وجسم الطائرة'], ['Yatış açısı', 'The bank angle', 'زاوية الميلان'], ['Pusula yönü', 'The compass heading', 'اتجاه البوصلة'], ['Kalkış pistinin eğimi', 'The runway slope', 'ميل المدرج']]);
  Q(2, ['RTH (Return to Home) işlevi ne yapar?', 'What does the RTH (Return to Home) function do?', 'ماذا تفعل وظيفة العودة إلى نقطة الإقلاع (RTH)؟'],
    [['Aracı otomatik olarak kalkış noktasına geri getirir', 'Automatically flies the aircraft back to the take-off point', 'تعيد الطائرة تلقائياً إلى نقطة الإقلاع'], ['Motorları hemen kapatır', 'Shuts the motors off immediately', 'توقف المحركات فوراً'], ['En yüksek irtifaya tırmanır ve orada kalır', 'Climbs to maximum altitude and stays there', 'تصعد إلى أقصى ارتفاع وتبقى هناك'], ['Pusulayı kalibre eder', 'Calibrates the compass', 'تعاير البوصلة'], ['Kamerayı kayda başlatır', 'Starts camera recording', 'تبدأ تسجيل الكاميرا']]);
  Q(2, ['Pusula kalibrasyonu neden gereklidir?', 'Why is compass calibration needed?', 'لماذا تُعدّ معايرة البوصلة ضرورية؟'],
    [['Manyetik bozulmaları düzeltip yön bilgisini doğru tutmak için', 'To correct magnetic interference so the heading is accurate', 'لتصحيح التداخل المغناطيسي حتى يكون الاتجاه دقيقاً'], ['Batarya süresini artırmak için', 'To increase battery life', 'لزيادة عمر البطارية'], ['Kamera görüntüsünü netleştirmek için', 'To sharpen the camera image', 'لتحسين وضوح صورة الكاميرا'], ['Motor gücünü artırmak için', 'To increase motor power', 'لزيادة قدرة المحرك'], ['Ağırlığı azaltmak için', 'To reduce weight', 'لتقليل الوزن']]);
  Q(2, ['İrtifa arttıkça hava yoğunluğu nasıl değişir?', 'How does air density change as altitude increases?', 'كيف تتغير كثافة الهواء مع زيادة الارتفاع؟'],
    [['Azalır', 'It decreases', 'تقل'], ['Artar', 'It increases', 'تزداد'], ['Değişmez', 'It stays the same', 'تبقى كما هي'], ['İki katına çıkar', 'It doubles', 'تتضاعف'], ['1000 m\'de sıfır olur', 'It becomes zero at 1000 m', 'تصبح صفراً عند 1000 م']]);
  Q(2, ['Sıcak havanın uçuş performansına etkisi nedir?', 'What is the effect of hot weather on flight performance?', 'ما تأثير الطقس الحار على أداء الطيران؟'],
    [['Hava yoğunluğu düşer; taşıma ve performans azalır', 'Air density falls, reducing lift and performance', 'تنخفض كثافة الهواء فيقل الرفع والأداء'], ['Taşıma artar', 'Lift increases', 'يزداد الرفع'], ['Hiçbir etkisi yoktur', 'It has no effect', 'لا يوجد تأثير'], ['Batarya kapasitesi iki katına çıkar', 'Battery capacity doubles', 'تتضاعف سعة البطارية'], ['İtki artar', 'Thrust increases', 'يزداد الدفع']]);
  Q(2, ['LiPo bataryadaki "C değeri" neyi gösterir?', 'What does the "C rating" of a LiPo battery indicate?', 'ماذا يدل "معدل C" في بطارية LiPo؟'],
    [['Güvenli en yüksek deşarj hızını', 'The maximum safe discharge rate', 'أقصى معدل تفريغ آمن'], ['Hücre sayısını', 'The number of cells', 'عدد الخلايا'], ['Ağırlığını', 'Its weight', 'وزنها'], ['Gerilimini', 'Its voltage', 'جهدها'], ['Üretim yılını', 'The year of manufacture', 'سنة التصنيع']]);
  Q(2, ['Bir LiPo hücresinin anma (nominal) gerilimi kaç volttur?', 'What is the nominal voltage of one LiPo cell?', 'ما الجهد الاسمي لخلية LiPo واحدة؟'],
    ['3,7 V', '1,2 V', '1,5 V', '5 V', '12 V'].map((v) => [v, v.replace(',', '.'), v.replace(',', '.')]));
  Q(2, ['"4S" LiPo batarya ne anlama gelir?', 'What does a "4S" LiPo battery mean?', 'ماذا تعني بطارية LiPo من نوع "4S"؟'],
    [['Seri bağlı 4 hücre', '4 cells in series', '4 خلايا موصولة على التوالي'], ['4 amper-saat kapasite', '4 Ah capacity', 'سعة 4 أمبير-ساعة'], ['4 volt gerilim', '4 volts', 'جهد 4 فولت'], ['Paralel bağlı 4 hücre', '4 cells in parallel', '4 خلايا موصولة على التوازي'], ['4 dakikalık uçuş süresi', '4 minutes of flight time', 'زمن طيران 4 دقائق']]);
  Q(2, ['Ağırlık merkezi fazla geride (kuyruğa yakın) olursa ne olur?', 'What happens if the centre of gravity is too far aft?', 'ماذا يحدث إذا كان مركز الثقل متأخراً جداً (قريباً من الذيل)؟'],
    [['Uçak dengesizleşir, yunuslama kontrolü zorlaşır', 'The aircraft becomes unstable and hard to control in pitch', 'تصبح الطائرة غير مستقرة ويصعب التحكم بها في الانحدار'], ['Uçak daha dengeli olur', 'The aircraft becomes more stable', 'تصبح الطائرة أكثر استقراراً'], ['Uçuş süresi uzar', 'Flight time increases', 'يزداد زمن الطيران'], ['Hiçbir etkisi olmaz', 'There is no effect', 'لا يوجد أي تأثير'], ['Yalnızca hız artar', 'Only the speed increases', 'تزداد السرعة فقط']]);
  Q(2, ['Bağlantı koptuğunda "failsafe" ne yapar?', 'What does the failsafe do when the radio link is lost?', 'ماذا يفعل نظام الأمان (Failsafe) عند فقدان الاتصال اللاسلكي؟'],
    [['Önceden ayarlanmış eylemi uygular (eve dönüş, iniş, bekleme)', 'Performs a preset action (return home, land or loiter)', 'ينفذ إجراءً محدداً مسبقاً (العودة أو الهبوط أو التحويم)'], ['Hızı artırır', 'Increases speed', 'يزيد السرعة'], ['GPS\'i kapatır', 'Switches off the GPS', 'يطفئ نظام GPS'], ['Uçuş kayıtlarını siler', 'Deletes the flight logs', 'يحذف سجلات الطيران'], ['Hiçbir şey yapmaz', 'Does nothing', 'لا يفعل شيئاً']]);
  Q(2, ['Karşıdan esen rüzgâr (headwind) yer hızını nasıl etkiler?', 'How does a headwind affect ground speed?', 'كيف تؤثر الرياح المعاكسة على السرعة الأرضية؟'],
    [['Yer hızını azaltır', 'It decreases ground speed', 'تقلل السرعة الأرضية'], ['Yer hızını artırır', 'It increases ground speed', 'تزيد السرعة الأرضية'], ['Etkilemez', 'It has no effect', 'لا تؤثر'], ['Hava hızını iki katına çıkarır', 'It doubles airspeed', 'تضاعف السرعة الجوية'], ['Aracı tamamen durdurur', 'It stops the aircraft completely', 'توقف الطائرة تماماً']]);

  /* ================= İHA / Havacılık — İleri ================= */
  Q(3, ['PID denetleyicide D (türev) teriminin temel görevi nedir?', 'What is the main role of the D (derivative) term in a PID controller?', 'ما الدور الرئيسي للحد التفاضلي (D) في متحكم PID؟'],
    [['Hatanın değişim hızına karşı sönümleme yapıp aşmayı azaltmak', 'Damping the rate of change of error to reduce overshoot', 'إخماد معدل تغير الخطأ لتقليل التجاوز'], ['Kalıcı (birikmiş) hatayı gidermek', 'Removing steady-state (accumulated) error', 'إزالة الخطأ المتراكم'], ['Hatayla orantılı tepki vermek', 'Responding in proportion to the error', 'الاستجابة بما يتناسب مع الخطأ'], ['En yüksek hızı sınırlamak', 'Limiting maximum speed', 'تحديد السرعة القصوى'], ['GPS verisini süzmek', 'Filtering GPS data', 'ترشيح بيانات GPS']]);
  Q(3, ['PID denetleyicide I (integral) terimi ne işe yarar?', 'What does the I (integral) term do in a PID controller?', 'ما وظيفة الحد التكاملي (I) في متحكم PID؟'],
    [['Zamanla biriken kalıcı hatayı giderir', 'Eliminates steady-state error accumulated over time', 'يزيل الخطأ الدائم المتراكم مع الزمن'], ['Titreşimleri sönümler', 'Damps oscillations', 'يخمد الاهتزازات'], ['Anlık tepkiyi artırır', 'Increases instant response', 'يزيد الاستجابة اللحظية'], ['Motor sıcaklığını ölçer', 'Measures motor temperature', 'يقيس حرارة المحرك'], ['Radyo bağlantısını kurar', 'Binds the radio link', 'يربط الاتصال اللاسلكي']]);
  Q(3, ['IMU, aracın duruşunu (attitude) hangi algılayıcılarla hesaplar?', 'Which sensors does an IMU use to estimate attitude?', 'ما الحساسات التي تستخدمها وحدة القياس بالقصور الذاتي (IMU) لتقدير وضعية الطائرة؟'],
    [['Jiroskop ve ivmeölçer (çoğunlukla manyetometre ile)', 'Gyroscope and accelerometer (often with a magnetometer)', 'الجيروسكوب ومقياس التسارع (غالباً مع مقياس المغناطيسية)'], ['GPS ve barometre', 'GPS and barometer', 'GPS والبارومتر'], ['Kamera ve lidar', 'Camera and lidar', 'الكاميرا والليدار'], ['Pitot tüpü ve termometre', 'Pitot tube and thermometer', 'أنبوب بيتو ومقياس الحرارة'], ['Akım ve gerilim algılayıcısı', 'Current and voltage sensor', 'حساس التيار والجهد']]);
  Q(3, ['Kanat yüklemesi (wing loading) nasıl hesaplanır?', 'How is wing loading calculated?', 'كيف يُحسب حمل الجناح (Wing loading)؟'],
    [['Ağırlık ÷ kanat alanı', 'Weight ÷ wing area', 'الوزن ÷ مساحة الجناح'], ['Kanat açıklığı ÷ veter', 'Wingspan ÷ chord', 'باع الجناح ÷ الوتر'], ['Taşıma ÷ sürükleme', 'Lift ÷ drag', 'الرفع ÷ السحب'], ['İtki ÷ ağırlık', 'Thrust ÷ weight', 'الدفع ÷ الوزن'], ['Veter × açıklık', 'Chord × span', 'الوتر × الباع']]);
  Q(3, ['Kanat açıklık oranı (aspect ratio) nasıl bulunur?', 'How is the aspect ratio of a wing found?', 'كيف تُحسب نسبة الباع (Aspect ratio) للجناح؟'],
    [['Açıklık² ÷ kanat alanı', 'Span² ÷ wing area', 'مربع الباع ÷ مساحة الجناح'], ['Kanat alanı ÷ ağırlık', 'Wing area ÷ weight', 'مساحة الجناح ÷ الوزن'], ['Veter ÷ açıklık', 'Chord ÷ span', 'الوتر ÷ الباع'], ['Taşıma ÷ ağırlık', 'Lift ÷ weight', 'الرفع ÷ الوزن'], ['Açıklık × ağırlık', 'Span × weight', 'الباع × الوزن']]);
  Q(3, ['Dönüşte stall hızı neden artar?', 'Why does stall speed increase in a turn?', 'لماذا تزداد سرعة الانهيار أثناء الانعطاف؟'],
    [['Yük faktörü (g) arttığı için', 'Because the load factor increases', 'لأن معامل الحمل يزداد'], ['Hava yoğunluğu arttığı için', 'Because air density increases', 'لأن كثافة الهواء تزداد'], ['İtki azaldığı için', 'Because thrust decreases', 'لأن الدفع يقل'], ['Ağırlık azaldığı için', 'Because weight decreases', 'لأن الوزن يقل'], ['Sürükleme azaldığı için', 'Because drag decreases', 'لأن السحب يقل']]);
  Q(3, ['İrtifa kaybetmeden 60° yatışla yapılan dönüşte yük faktörü kaçtır?', 'What is the load factor in a level turn at 60° of bank?', 'ما معامل الحمل في انعطاف أفقي بزاوية ميلان 60°؟'],
    ['2 g', '1 g', '1,5 g', '3 g', '0,5 g'].map((v) => [v, v.replace(',', '.'), v.replace(',', '.')]));
  Q(3, ['"Flutter" nedir?', 'What is "flutter"?', 'ما هي ظاهرة "الرفرفة (Flutter)"؟'],
    [['Yüksek hızda yüzeylerde büyüyerek yıkıcı olabilen aeroelastik titreşim', 'Aeroelastic vibration of surfaces that can grow destructively at high speed', 'اهتزاز مرن هوائي للأسطح قد يتضخم ويصبح مدمراً عند السرعات العالية'], ['Motor sesi', 'Motor noise', 'ضجيج المحرك'], ['GPS kayması', 'GPS drift', 'انحراف GPS'], ['Bataryanın şişmesi', 'Battery swelling', 'انتفاخ البطارية'], ['Görüntü aktarım gecikmesi', 'Video link latency', 'تأخر نقل الفيديو']]);
  Q(3, ['Uçuş kontrolcülerinde EKF (Genişletilmiş Kalman Süzgeci) ne için kullanılır?', 'What is the EKF (Extended Kalman Filter) used for in flight controllers?', 'فيمَ يُستخدم مرشح كالمان الموسع (EKF) في وحدات التحكم بالطيران؟'],
    [['Algılayıcı verilerini birleştirip konum/duruş tahmini yapmak', 'Fusing sensor data to estimate position and attitude', 'دمج بيانات الحساسات لتقدير الموقع والوضعية'], ['Bataryayı şarj etmek', 'Charging the battery', 'شحن البطارية'], ['Görüntü sıkıştırmak', 'Compressing video', 'ضغط الفيديو'], ['Kumanda eşleştirmek', 'Binding the transmitter', 'ربط جهاز التحكم'], ['Motor zamanlamasını ayarlamak', 'Setting motor timing', 'ضبط توقيت المحرك']]);
  Q(3, ['Yer etkisi (ground effect) yaklaşık hangi yükseklikte belirgindir?', 'At roughly what height is ground effect significant?', 'عند أي ارتفاع تقريباً يكون تأثير الأرض (Ground effect) ملحوظاً؟'],
    [['Yaklaşık bir kanat açıklığı yükseklikte ve altında', 'Within about one wingspan of the ground', 'ضمن ارتفاع يقارب باع جناح واحد عن الأرض'], ['100 metrede', 'At 100 metres', 'عند 100 متر'], ['On kanat açıklığı yükseklikte', 'At ten wingspans', 'عند عشرة أضعاف الباع'], ['Yalnızca su üzerinde', 'Only over water', 'فوق الماء فقط'], ['Seyir irtifasında', 'At cruise altitude', 'عند ارتفاع التحليق']]);
  Q(3, ['Süzülme oranı 10:1 olan bir uçak durgun havada 100 m irtifadan yaklaşık ne kadar uzağa süzülür?', 'An aircraft with a 10:1 glide ratio is at 100 m in still air. About how far can it glide?', 'طائرة نسبة انزلاقها 10:1 على ارتفاع 100 م في هواء ساكن. ما المسافة التقريبية التي يمكنها الانزلاق إليها؟'],
    ['1000 m', '100 m', '10 m', '10 000 m', '500 m'].map((v) => [v, v.replace(' 000', ',000'), v.replace(' م', ' م').replace('m', 'م')]));

  Q(3, ['Pitot-statik sistemde hava hızı neye göre hesaplanır?', 'In a pitot-static system, what is airspeed derived from?', 'في نظام بيتو-الضغط الساكن، من أي شيء تُحسب السرعة الجوية؟'],
    [['Toplam basınç ile statik basınç arasındaki farka (dinamik basınç)', 'The difference between total and static pressure (dynamic pressure)', 'الفرق بين الضغط الكلي والضغط الساكن (الضغط الديناميكي)'], ['Yalnızca statik basınca', 'Static pressure alone', 'الضغط الساكن وحده'], ['GPS yer hızına', 'GPS ground speed', 'السرعة الأرضية من GPS'], ['Motor devrine', 'Motor RPM', 'سرعة دوران المحرك'], ['Dış hava sıcaklığına', 'Outside air temperature', 'درجة حرارة الهواء الخارجي']]);

  /* ================= İngilizce — Öğrenci ================= */
  E(1, 'gap', 'She ___ to school every day.', ['goes', 'go', 'going', 'gone', 'to go']);
  E(1, 'gap', 'There ___ two books on the table.', ['are', 'is', 'am', 'be', 'was']);
  E(1, 'gap', 'I ___ a student.', ['am', 'is', 'are', 'be', 'been']);
  E(1, 'gap', 'They ___ football yesterday.', ['played', 'play', 'plays', 'playing', 'will play']);
  E(1, 'gap', 'He is ___ than his brother.', ['taller', 'tall', 'tallest', 'more tall', 'most tall']);
  E(1, 'gap', 'We have English ___ Monday.', ['on', 'in', 'at', 'by', 'to']);
  E(1, 'gap', 'Where ___ you live?', ['do', 'does', 'is', 'are', 'am']);
  E(1, 'gap', 'This is ___ apple.', ['an', 'a', 'two', 'many', 'these']);
  E(1, 'opp', 'big', ['small', 'large', 'huge', 'tall', 'wide']);
  E(1, 'opp', 'hot', ['cold', 'warm', 'wet', 'dry', 'bright']);
  E(1, 'syn', 'happy', ['glad', 'sad', 'angry', 'tired', 'bored']);
  E(1, 'syn', 'begin', ['start', 'finish', 'stop', 'end', 'close']);

  /* ================= İngilizce — Orta ================= */
  E(2, 'gap', 'If it rains tomorrow, we ___ at home.', ['will stay', 'stayed', 'would have stayed', 'staying', 'had stayed']);
  E(2, 'gap', 'I have lived here ___ 2015.', ['since', 'for', 'from', 'during', 'ago']);
  E(2, 'gap', 'She has ___ finished her homework.', ['already', 'yet', 'still', 'ever', 'ago']);
  E(2, 'gap', 'I\'m used to ___ up early.', ['getting', 'get', 'got', 'gets', 'be get']);
  E(2, 'gap', 'The aircraft ___ by the technician before every flight.', ['is inspected', 'inspects', 'inspecting', 'inspect', 'has inspect']);
  E(2, 'gap', 'By the time we arrived, the film ___.', ['had started', 'has started', 'starts', 'will start', 'is starting']);
  E(2, 'gap', 'She is interested ___ aviation.', ['in', 'on', 'at', 'for', 'with']);
  E(2, 'gap', 'You ___ wear a seatbelt; it is the law.', ['must', 'might', 'could', 'may', 'would']);
  E(2, 'syn', 'rapid', ['fast', 'slow', 'heavy', 'quiet', 'weak']);
  E(2, 'syn', 'purchase', ['buy', 'sell', 'borrow', 'lend', 'rent']);
  E(2, 'opp', 'increase', ['decrease', 'raise', 'grow', 'expand', 'rise']);
  E(2, 'opp', 'arrival', ['departure', 'landing', 'entrance', 'approach', 'return']);

  /* ================= İngilizce — İleri ================= */
  E(3, 'gap', 'Had I known about the delay, I ___ earlier.', ['would have left', 'would leave', 'will leave', 'had left', 'left']);
  E(3, 'gap', 'Not only ___ the exam, but she also got the highest score.', ['did she pass', 'she passed', 'she did pass', 'passed she', 'has passed she']);
  E(3, 'gap', 'Scarcely had the aircraft landed ___ the storm began.', ['when', 'than', 'then', 'that', 'as']);
  E(3, 'gap', 'It\'s high time we ___ a decision.', ['made', 'make', 'will make', 'making', 'have made']);
  E(3, 'gap', 'The engine failure was attributed ___ poor maintenance.', ['to', 'for', 'with', 'by', 'on']);
  E(3, 'gap', '___ the bad weather, the flight took off on time.', ['Despite', 'Although', 'Because', 'However', 'Even']);
  E(3, 'gap', 'The report, ___ was published last week, caused controversy.', ['which', 'that', 'what', 'who', 'whom']);
  E(3, 'syn', 'mitigate', ['alleviate', 'aggravate', 'ignore', 'initiate', 'imitate']);
  E(3, 'syn', 'meticulous', ['thorough', 'careless', 'rapid', 'reluctant', 'generous']);
  E(3, 'syn', 'ambiguous', ['unclear', 'obvious', 'precise', 'certain', 'definite']);
  E(3, 'opp', 'scarce', ['abundant', 'rare', 'limited', 'meagre', 'sparse']);
  E(3, 'opp', 'deteriorate', ['improve', 'decline', 'worsen', 'collapse', 'decay']);

  /* ================= Senaryolar ================= */
  let sn = 0;
  // q: [[metin tr,en,ar], [cevap tr,en,ar]]
  const S = (lvl, topic, title, text, qs) => scenarios.push({
    id: 's' + (++sn), lvl, topic, title: M(...title), text: M(...text),
    questions: qs.map(([q, a]) => ({ text: M(...q), answer: M(...a) })),
  });
  // İngilizce okuma parçası: her dilde aynı metin
  const SE = (lvl, title, text, qs) => scenarios.push({
    id: 's' + (++sn), lvl, topic: 'eng', title: same(title), text: same(text),
    questions: qs.map(([q, a]) => ({ text: same(q), answer: same(a) })),
  });

  // --- İHA, Öğrenci
  S(1, 'uav', ['Uçuş öncesi kontrol', 'Pre-flight check', 'الفحص قبل الطيران'],
    ['Ali parkta quadcopter uçuracaktır. Batarya %40 dolu görünüyor, pervanelerden birinde küçük bir çatlak var ve rüzgâr hafif.',
      'Ali is about to fly a quadcopter in a park. The battery shows 40%, one propeller has a small crack and the wind is light.',
      'يستعد علي للطيران بطائرة رباعية في حديقة. تُظهر البطارية 40%، وفي إحدى المراوح شرخ صغير، والرياح خفيفة.'],
    [[['Ali uçuşa başlamalı mı? Neden?', 'Should Ali fly? Why?', 'هل يجب أن يطير علي؟ لماذا؟'],
      ['Hayır. Çatlak pervane değiştirilmeli ve batarya uçuştan önce tam şarj edilmelidir.', 'No. The cracked propeller must be replaced and the battery fully charged before flight.', 'لا. يجب استبدال المروحة المشروخة وشحن البطارية بالكامل قبل الطيران.']],
    [['Uçuş öncesi kontrolde nelere bakılmalıdır?', 'What should be checked before flight?', 'ما الذي يجب فحصه قبل الطيران؟'],
      ['Batarya şarjı, pervaneler ve gövde, GPS/pusula durumu, kumanda bağlantısı, hava durumu ve uçuş alanı.', 'Battery charge, propellers and frame, GPS/compass status, radio link, weather and the flight area.', 'شحن البطارية، المراوح والهيكل، حالة GPS والبوصلة، اتصال جهاز التحكم، الطقس ومنطقة الطيران.']]]);
  S(1, 'uav', ['Sinyal kaybı', 'Signal lost', 'فقدان الإشارة'],
    ['Uçuş sırasında ekranda "Sinyal kaybedildi" uyarısı çıkıyor. Araç pilottan 300 m uzakta.',
      'During the flight the screen shows "Signal lost". The aircraft is 300 m away from the pilot.',
      'أثناء الطيران تظهر على الشاشة رسالة "فُقدت الإشارة". الطائرة على بعد 300 م من الطيار.'],
    [[['Doğru ayarlanmış bir failsafe bu durumda ne yapar?', 'What does a correctly configured failsafe do in this case?', 'ماذا يفعل نظام الأمان المضبوط بشكل صحيح في هذه الحالة؟'],
      ['Önceden seçilmiş eylemi uygular: kalkış noktasına döner (RTH) ya da güvenli iniş yapar.', 'It performs the preset action: returns to home (RTH) or lands safely.', 'ينفذ الإجراء المحدد مسبقاً: العودة إلى نقطة الإقلاع (RTH) أو الهبوط الآمن.']],
    [['Pilot bu duruma hazırlıklı olmak için uçuştan önce ne yapmalıdır?', 'What should the pilot do before flight to be prepared for this?', 'ماذا يجب أن يفعل الطيار قبل الطيران ليكون مستعداً لذلك؟'],
      ['Eve dönüş irtifasını engellerden yüksek ayarlamalı ve kalkış noktasının kaydedildiğini doğrulamalıdır.', 'Set the RTH altitude above all obstacles and confirm that the home point has been recorded.', 'ضبط ارتفاع العودة أعلى من العوائق والتأكد من تسجيل نقطة الإقلاع.']]]);
  S(1, 'uav', ['Düşük batarya', 'Low battery', 'انخفاض البطارية'],
    ['Soğuk bir kış gününde araç 800 m uzaktayken "Düşük batarya" uyarısı veriyor. Görev henüz bitmedi.',
      'On a cold winter day the aircraft gives a "Low battery" warning while it is 800 m away. The mission is not finished yet.',
      'في يوم شتوي بارد تعطي الطائرة تحذير "انخفاض البطارية" وهي على بعد 800 م، ولم تنتهِ المهمة بعد.'],
    [[['Pilot ne yapmalıdır?', 'What should the pilot do?', 'ماذا يجب أن يفعل الطيار؟'],
      ['Göreve devam etmemeli; aracı hemen geri getirmeli ya da güvenli bir yere indirmelidir.', 'Not continue the mission; bring the aircraft back immediately or land it in a safe place.', 'لا يتابع المهمة؛ بل يعيد الطائرة فوراً أو يهبط بها في مكان آمن.']],
    [['Soğuk hava batarya süresini neden kısaltır?', 'Why does cold weather shorten battery time?', 'لماذا يقلل الطقس البارد زمن البطارية؟'],
      ['Soğukta kimyasal tepkimeler yavaşlar, iç direnç artar ve gerilim daha hızlı düşer.', 'In the cold, chemical reactions slow down, internal resistance rises and voltage drops faster.', 'في البرد تتباطأ التفاعلات الكيميائية وتزداد المقاومة الداخلية فينخفض الجهد بسرعة أكبر.']]]);
  // --- İHA, Orta
  S(2, 'uav', ['Sıcak ve yüksek', 'Hot and high', 'حرارة وارتفاع'],
    ['Sabit kanatlı bir İHA, 2000 m rakımdaki bir pistten 35 °C sıcaklıkta kalkış yapacaktır.',
      'A fixed-wing UAV will take off from a runway at 2000 m elevation when the temperature is 35 °C.',
      'ستقلع طائرة مسيّرة ثابتة الجناح من مدرج على ارتفاع 2000 م والحرارة 35 °م.'],
    [[['Bu koşullar kalkışı nasıl etkiler?', 'How do these conditions affect take-off?', 'كيف تؤثر هذه الظروف على الإقلاع؟'],
      ['Yoğunluk irtifası yüksektir; hava seyrek olduğundan taşıma ve itki azalır, kalkış mesafesi uzar.', 'Density altitude is high; the thin air reduces lift and thrust, so the take-off run is longer.', 'ارتفاع الكثافة مرتفع؛ الهواء الرقيق يقلل الرفع والدفع فتطول مسافة الإقلاع.']],
    [['Hangi önlemler alınabilir?', 'What precautions can be taken?', 'ما الاحتياطات التي يمكن اتخاذها؟'],
      ['Faydalı yük azaltılır, rüzgâra karşı ve uzun pist kullanılır, uçuş serin sabah saatlerine alınır.', 'Reduce the payload, take off into the wind on a longer runway, and fly in the cooler morning hours.', 'تقليل الحمولة، والإقلاع عكس الرياح على مدرج أطول، والطيران في ساعات الصباح الباردة.']]]);
  S(2, 'uav', ['Ağırlık merkezi', 'Centre of gravity', 'مركز الثقل'],
    ['Kuyruğa yeni bir kamera takıldıktan sonra uçak sürekli burun yukarı yapıyor ve kontrolü zorlaşıyor.',
      'After a new camera was mounted on the tail, the aircraft keeps pitching nose-up and is hard to control.',
      'بعد تركيب كاميرا جديدة على الذيل أصبحت الطائرة ترفع مقدمتها باستمرار ويصعب التحكم بها.'],
    [[['Sorunun nedeni nedir?', 'What is the cause of the problem?', 'ما سبب المشكلة؟'],
      ['Ağırlık merkezi geriye kaymış, uçak boylamasına dengesiz hâle gelmiştir.', 'The centre of gravity has moved aft, making the aircraft longitudinally unstable.', 'انتقل مركز الثقل إلى الخلف فأصبحت الطائرة غير مستقرة طولياً.']],
    [['Nasıl düzeltilir?', 'How can it be fixed?', 'كيف يمكن إصلاحها؟'],
      ['Batarya öne alınır ya da buruna denge ağırlığı eklenir veya kamera yeri değiştirilir; uçuştan önce ağırlık merkezi ölçülür.', 'Move the battery forward, add nose ballast or relocate the camera, and check the CG before flight.', 'تحريك البطارية إلى الأمام أو إضافة ثقل في المقدمة أو نقل الكاميرا، وفحص مركز الثقل قبل الطيران.']]]);
  S(2, 'uav', ['Yan rüzgârda iniş', 'Crosswind landing', 'الهبوط مع رياح جانبية'],
    ['İniş sırasında piste dik yönden 25 km/sa hızla rüzgâr esiyor.',
      'During landing a 25 km/h wind is blowing across the runway.',
      'أثناء الهبوط تهب رياح بسرعة 25 كم/س عمودياً على المدرج.'],
    [[['İniş yönü nasıl seçilmelidir?', 'How should the landing direction be chosen?', 'كيف يجب اختيار اتجاه الهبوط؟'],
      ['Mümkün olduğunca rüzgâra karşı iniş yapılacak yön seçilmelidir.', 'Choose the direction that puts the aircraft as much into the wind as possible.', 'اختيار الاتجاه الذي يجعل الطائرة عكس الرياح قدر الإمكان.']],
    [['Hangi teknik uygulanmalıdır?', 'Which technique should be applied?', 'ما الأسلوب الذي يجب تطبيقه؟'],
      ['Rüzgâra doğru yengeç (crab) ya da kanat aşağı yöntemiyle hizalanılır, yaklaşma hızı biraz artırılır; yaklaşma kararsızsa pas geçilir.', 'Use a crab or wing-low technique, keep a slightly higher approach speed, and go around if the approach is unstable.', 'استخدام أسلوب الانحراف (Crab) أو خفض الجناح، والحفاظ على سرعة اقتراب أعلى قليلاً، وإعادة المحاولة إذا كان الاقتراب غير مستقر.']]]);
  // --- İHA, İleri
  S(3, 'uav', ['Salınım', 'Oscillation', 'التذبذب'],
    ['Yeni motorlar takıldıktan sonra çok rotorlu araç havada asılı kalırken hızlı salınımlar yapıyor.',
      'After new motors were installed, the multirotor oscillates rapidly while hovering.',
      'بعد تركيب محركات جديدة أصبحت الطائرة متعددة المراوح تتذبذب بسرعة أثناء التحويم.'],
    [[['PID açısından olası neden nedir?', 'What is the likely PID-related cause?', 'ما السبب المحتمل المتعلق بإعدادات PID؟'],
      ['P (veya D) kazancı yeni motorlar için fazla yüksektir.', 'The P (or D) gain is too high for the new motors.', 'كسب P (أو D) مرتفع جداً بالنسبة للمحركات الجديدة.']],
    [['Ayar nasıl yapılmalıdır?', 'How should the tuning be done?', 'كيف يجب إجراء الضبط؟'],
      ['P kademeli düşürülür, D sönümleme için ayarlanır; pervane dengesi ve titreşim kontrol edilir, her adım test edilip kayıtlar incelenir.', 'Lower P step by step, adjust D for damping, check propeller balance and vibration, and test each step while reviewing the logs.', 'خفض P تدريجياً وضبط D للإخماد، وفحص توازن المراوح والاهتزاز، واختبار كل خطوة ومراجعة السجلات.']]]);
  S(3, 'uav', ['Pusula hatası', 'Compass error', 'خطأ البوصلة'],
    ['GPS modunda, çelik bir yapının yakınında araç kendiliğinden giderek büyüyen daireler çiziyor.',
      'In GPS mode, near a steel structure, the aircraft starts flying in growing circles by itself.',
      'في وضع GPS وبالقرب من هيكل فولاذي تبدأ الطائرة بالدوران في دوائر تتسع من تلقاء نفسها.'],
    [[['Bu davranışın nedeni nedir?', 'What causes this behaviour?', 'ما سبب هذا السلوك؟'],
      ['Manyetik bozulma ya da hatalı pusula kalibrasyonu nedeniyle yön (heading) bilgisi yanlıştır.', 'Magnetic interference or a poor compass calibration gives a wrong heading.', 'التداخل المغناطيسي أو المعايرة الخاطئة للبوصلة يؤديان إلى اتجاه خاطئ.']],
    [['Pilot ne yapmalıdır?', 'What should the pilot do?', 'ماذا يجب أن يفعل الطيار؟'],
      ['Duruş (attitude) ya da elle kumanda moduna geçip güvenli iniş yapmalı; metalden uzakta yeniden kalibre etmeli ve pusula yerleşimini kontrol etmelidir.', 'Switch to attitude/manual mode and land safely, recalibrate away from metal, and check where the compass is mounted.', 'التحويل إلى وضع الوضعية أو اليدوي والهبوط بأمان، ثم إعادة المعايرة بعيداً عن المعادن وفحص موضع البوصلة.']]]);
  S(3, 'uav', ['Motor arızasında süzülme', 'Gliding after engine failure', 'الانزلاق بعد تعطل المحرك'],
    ['Sabit kanatlı aracın motoru 150 m irtifada duruyor. Süzülme oranı 12:1, pist 2 km uzakta ve rüzgâr yok.',
      'The engine of a fixed-wing aircraft stops at 150 m. Its glide ratio is 12:1, the runway is 2 km away and there is no wind.',
      'يتوقف محرك طائرة ثابتة الجناح على ارتفاع 150 م. نسبة انزلاقها 12:1، والمدرج على بعد 2 كم، ولا توجد رياح.'],
    [[['Araç piste ulaşabilir mi? Hesaplayın.', 'Can the aircraft reach the runway? Calculate.', 'هل تستطيع الطائرة الوصول إلى المدرج؟ احسب.'],
      ['En fazla 150 × 12 = 1800 m süzülebilir; bu 2000 m\'den az olduğu için piste ulaşamaz.', 'Maximum glide distance is 150 × 12 = 1800 m, which is less than 2000 m, so it cannot reach the runway.', 'أقصى مسافة انزلاق 150 × 12 = 1800 م، وهي أقل من 2000 م، لذا لا يمكنها الوصول.']],
    [['Pilot ne yapmalıdır?', 'What should the pilot do?', 'ماذا يجب أن يفعل الطيار؟'],
      ['En iyi süzülme hızını kurmalı, 1,8 km içinde önündeki güvenli bir alanı seçmeli, irtifa kaybettiren dönüşlerden kaçınmalı ve çevredekileri uyarmalıdır.', 'Set the best glide speed, choose a safe field ahead within 1.8 km, avoid turns that waste altitude, and warn people nearby.', 'ضبط أفضل سرعة انزلاق، واختيار منطقة آمنة أمامه ضمن 1.8 كم، وتجنب الانعطافات التي تُفقد الارتفاع، وتحذير من في المكان.']]]);
  // --- İngilizce okuma
  SE(1, "Tom's Day", 'Tom gets up at seven o\'clock. He has breakfast with his sister and then walks to school. After school, he plays football in the park.',
    [['What time does Tom get up?', 'At seven o\'clock.'], ['How does he go to school?', 'He walks to school.'], ['What does he do after school?', 'He plays football in the park.']]);
  SE(1, 'At the Airport', 'Sara is at the airport. Her flight to London leaves at 10:30. She checks in, shows her passport and waits at gate 12.',
    [['Where is Sara going?', 'To London.'], ['What time does her flight leave?', 'At 10:30.'], ['Where does she wait?', 'At gate 12.']]);
  SE(2, 'Drones in Farming', 'Farmers increasingly use drones to monitor their crops. Cameras on the drones detect areas that need water or fertiliser, which saves both time and money. However, drones require trained operators and good weather.',
    [['Why do farmers use drones?', 'To monitor crops and find areas that need water or fertiliser, saving time and money.'], ['Give one limitation of drones mentioned in the text.', 'They need trained operators / good weather.']]);
  SE(2, 'A Delayed Flight', 'Our flight was delayed for three hours because of fog. The airline offered free meals, and most passengers waited calmly. When we finally took off, the captain apologised for the delay.',
    [['Why was the flight delayed?', 'Because of fog.'], ['What did the airline offer?', 'Free meals.'], ['How did most passengers react?', 'They waited calmly.']]);
  SE(3, 'Automation and Skills', 'As cockpits become more automated, experts warn that pilots may gradually lose their manual flying skills. Regulators therefore encourage regular hand-flying practice so that crews can respond effectively when automation fails.',
    [['What concern do experts raise?', 'That pilots may lose their manual flying skills because of automation.'], ['What do regulators recommend, and why?', 'Regular hand-flying practice, so crews can respond effectively when automation fails.'], ['Find a word in the text meaning "people or bodies that make and enforce rules".', 'Regulators.']]);
  SE(3, 'Sharing the Sky', 'Integrating unmanned aircraft into shared airspace poses significant challenges. Unlike manned aircraft, UAVs cannot rely on a pilot on board to "see and avoid" other traffic, so detect-and-avoid systems must be certified to an equivalent level of safety.',
    [['What is the main challenge described?', 'Safely integrating unmanned aircraft into shared airspace.'], ['Why are detect-and-avoid systems necessary?', 'Because there is no pilot on board to see and avoid other traffic; the systems must provide an equivalent level of safety.']]);

  window.QBANK_BUILTIN = { v: '2026.11.16', questions, scenarios };
})();
