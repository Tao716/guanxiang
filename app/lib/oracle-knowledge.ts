import { changedLines, getHexagram, type Hexagram, type LineValue } from "./oracle";

export type ReadingCategory = "事业" | "关系" | "选择" | "成长";
export type ReadingSituationContext = { situation: string; focus: string; horizon: string };
export type HexagramKnowledge = {
  number: number;
  name: string;
  judgement: string;
  image: string;
  stage: string;
  focus: string;
  action: string;
  risk: string;
  timing: string;
};
export type LineReading = {
  index: number;
  label: string;
  value: LineValue;
  moving: boolean;
  selected: boolean;
  role: string;
  modern: string;
  action: string;
};
export type StructuredOracleReading = {
  verdict: string;
  insight: string;
  actions: string[];
  avoid: string;
  timing: string;
  mutual: Hexagram;
  transformed: Hexagram;
  lineReadings: LineReading[];
  selectedLines: LineReading[];
  selectionRule: string;
  relation: string;
  knowledge: HexagramKnowledge;
  questionFit: { intent: string; horizon: string; directAnswer: string; translation: string };
};

// 每一卦都拥有独立的判断骨架。这里存放现代产品使用的原创释义，
// 不把后世注本或自动生成的句子冒充《周易》原文。
const profiles: HexagramKnowledge[] = [
  { number:1,name:"乾",judgement:"以创造力开局，以自律让力量长久。",image:"天行相续，刚健而不间断。",stage:"势能形成并向外展开",focus:"主动、责任与节制",action:"确立主线，持续做能积累势能的事",risk:"只知前进，不知收束与听取反馈",timing:"可主动推进，越到高位越要预留退路" },
  { number:2,name:"坤",judgement:"先承接现实，再以稳定的配合孕育结果。",image:"大地宽厚，万物因承载而生长。",stage:"条件需要被接住和培育",focus:"承载、配合与长期耐心",action:"补齐支持条件，让人和资源各安其位",risk:"把顺从误当成没有主见",timing:"宜稳步积累，不争一时之先" },
  { number:3,name:"屯",judgement:"困难属于开端，不等于方向错误。",image:"云雷交作，新生之物艰难破土。",stage:"秩序尚未建立的起步期",focus:"立基、求助与容错",action:"找到第一个可运转的支点，再逐步扩展",risk:"条件未齐便孤注一掷",timing:"先难后易，以短周期试错换清晰" },
  { number:4,name:"蒙",judgement:"承认未知，建立正确的学习与求证顺序。",image:"山下出泉，水初流而方向未明。",stage:"认知需要启蒙和校正",focus:"提问、学习与边界",action:"向可信来源提出一个具体问题并验证",risk:"反复询问只为得到想听的答案",timing:"先学后定，获得新证据再作决定" },
  { number:5,name:"需",judgement:"等待不是停滞，而是有准备地等条件成熟。",image:"云在天上，雨意已成而尚未落下。",stage:"机会酝酿但窗口未开",focus:"准备、耐心与资源",action:"完善预案并设定明确的触发条件",risk:"用焦虑催促尚未成熟的局面",timing:"守住节奏，条件出现时果断行动" },
  { number:6,name:"讼",judgement:"分歧需要澄清，但不宜把输赢推到极端。",image:"天水背行，双方依据不同方向分离。",stage:"立场冲突正在显形",focus:"事实、规则与止争",action:"把争议从情绪还原为事实、责任和标准",risk:"为证明自己正确而耗尽关系和资源",timing:"宜早调停，不宜把冲突拖入长期对抗" },
  { number:7,name:"师",judgement:"复杂任务要靠纪律、授权和共同目标推进。",image:"地中有水，力量聚于内部而待调度。",stage:"需要组织资源共同作战",focus:"秩序、统筹与可信领导",action:"明确目标、角色、指挥链和退出条件",risk:"只有动员，没有约束和善后",timing:"准备充分再行动，过程须持续校准" },
  { number:8,name:"比",judgement:"真正的联合建立在相互选择和长期可信上。",image:"水行地上，彼此亲近并汇聚。",stage:"关系与联盟正在形成",focus:"信任、选择与互惠",action:"确认彼此承诺是否具体且双向",risk:"因害怕孤立而进入不合适的联盟",timing:"宜尽早表达诚意，迟疑太久会错过联结" },
  { number:9,name:"小畜",judgement:"力量尚小，先以细节和持续积累形成突破。",image:"风行天上，云聚而雨尚未成。",stage:"小有积蓄但不足以强攻",focus:"微小进展、约束与蓄势",action:"连续完成可复利的小动作",risk:"轻视小阻力，或急于追求大结果",timing:"短期宜蓄，积累到临界点再放大" },
  { number:10,name:"履",judgement:"身处强势条件旁，更要以礼、分寸和谨慎通行。",image:"泽在天下，如履虎尾而需知进退。",stage:"机会与风险同时靠近",focus:"分寸、规则与尊重",action:"确认边界后再迈出下一步",risk:"侥幸越界，把胆量当成能力",timing:"可以前行，但每一步都需可收回" },
  { number:11,name:"泰",judgement:"上下相通时，要让资源持续流动而非独占顺势。",image:"天地交感，内外通达。",stage:"合作顺畅、条件互相支持",focus:"流动、协同与居安思危",action:"趁通达建立长期机制并共享成果",risk:"把短期顺利误判为永久安全",timing:"当下可推进，同时提前设置风险边界" },
  { number:12,name:"否",judgement:"闭塞时先保存核心，不以蛮力强求通达。",image:"天地不交，内外各行其道。",stage:"沟通与资源流动受阻",focus:"守正、止损与等待转机",action:"缩小战线，保住关键关系和能力",risk:"为求认可而迎合错误结构",timing:"暂缓扩张，待真实条件改变再重启" },
  { number:13,name:"同人",judgement:"公开目标、跨越差异，才能形成真正的同行。",image:"天火同明，彼此照见共同方向。",stage:"需要从私人共识走向公开协作",focus:"共同目标、透明与求同",action:"把共同目标写成所有人可验证的约定",risk:"只和熟悉的人结盟，形成小圈层",timing:"宜主动连接不同背景的合作者" },
  { number:14,name:"大有",judgement:"拥有资源之后，更考验分配、担当与谦逊。",image:"火在天上，光明照见丰盛。",stage:"资源与影响力处于高位",focus:"善用、共享与责任",action:"把优势转化为可持续的公共价值",risk:"把所有成果归于自己并过度扩张",timing:"势能正盛，宜做有分量而不过量的事" },
  { number:15,name:"谦",judgement:"降低姿态并非削弱自己，而是让能力进入正确位置。",image:"山藏地中，有实而不自高。",stage:"实力需要稳定落位",focus:"谦抑、平衡与可信",action:"让成果说话，把空间留给他人",risk:"用自我贬低冒充谦逊",timing:"长期有利，越是被看见越要保持平实" },
  { number:16,name:"豫",judgement:"顺势动员可以形成热情，但必须提前防止松懈。",image:"雷出地上，万物因振动而和乐。",stage:"气氛升温、行动将起",focus:"预备、动员与节奏",action:"把热情转化为明确安排和第一步",risk:"沉浸期待，却没有执行结构",timing:"宜顺势启动，兴奋退去前形成习惯" },
  { number:17,name:"随",judgement:"跟随真实变化，但不可丢失原则与判断。",image:"泽中有雷，行动随环境而转。",stage:"旧方案正在让位于新信号",focus:"适应、回应与守正",action:"区分不可变的原则与可调整的方法",risk:"为了被接纳而盲从",timing:"变化已经发生，宜在近期完成调整" },
  { number:18,name:"蛊",judgement:"问题来自长期积累，修复要追溯根因并重建责任。",image:"山下有风，停滞之处渐生败坏。",stage:"旧问题暴露并要求整治",focus:"溯源、修复与重建",action:"找出反复出现的机制问题并明确责任人",risk:"只处理表面症状或相互指责",timing:"宜立即整顿，修复前后都要复盘" },
  { number:19,name:"临",judgement:"机会正在靠近，主动承担也要看见盛极将转。",image:"地上有泽，滋养与影响逐渐临近。",stage:"影响力增长、关系靠近",focus:"亲临、教导与预见",action:"走近现场，听取真实反馈并给予支持",risk:"只享受上升感，不准备后续变化",timing:"当前有利，越顺越要为下一阶段做准备" },
  { number:20,name:"观",judgement:"先观察全局，也让自己的行为经得起他人观看。",image:"风行地上，无形影响遍及四方。",stage:"行动前的观察与示范期",focus:"审视、榜样与全局",action:"退一步收集多方证据，检查自身影响",risk:"只观看别人，不反观自己",timing:"宜先观后动，结论需经过一轮验证" },
  { number:21,name:"噬嗑",judgement:"阻碍必须被明确处理，规则才会重新有效。",image:"雷电并作，以明断除去梗阻。",stage:"关键障碍已无法绕开",focus:"明断、规则与执行",action:"定义问题、证据和处置边界后果断解决",risk:"把惩罚当发泄，或因怕冲突继续拖延",timing:"证据齐备即处理，不宜久拖" },
  { number:22,name:"贲",judgement:"形式能够承载内容，但不能替代真实价值。",image:"山下有火，光彩照亮有限范围。",stage:"内容需要被表达和呈现",focus:"文饰、秩序与本质",action:"改善表达，让重要内容更易被理解",risk:"沉迷包装，掩盖基础问题",timing:"小事可优化，大方向仍以实质为先" },
  { number:23,name:"剥",judgement:"旧结构正在脱落，先止损并保住最小核心。",image:"山附于地，根基被逐层削弱。",stage:"支撑条件持续减少",focus:"剥落、止损与保存种子",action:"停止非必要消耗，保护最后的核心资源",risk:"否认衰退或急于修复外观",timing:"宜静守，不宜扩张；待旧势剥尽再重建" },
  { number:24,name:"復",judgement:"偏离之后回到起点，小而真实的恢复最重要。",image:"雷在地中，微阳重新萌生。",stage:"转折初现、能量刚刚返回",focus:"复归、修正与微小生机",action:"恢复一个曾经有效的基本动作",risk:"刚有好转就追求过大成果",timing:"转机已现，宜以七日为一轮稳步恢复" },
  { number:25,name:"无妄",judgement:"减少妄念和操控，按事实与正当原则行动。",image:"天下雷行，万物依其本性生长。",stage:"局面要求回到真实",focus:"真诚、事实与非操控",action:"去掉臆测，只对已知事实负责",risk:"以侥幸、捷径或强求制造意外",timing:"守正可行，不宜带着投机目的冒进" },
  { number:26,name:"大畜",judgement:"把强大力量收住、训练并用在长期目标上。",image:"天在山中，巨大能量被蓄养。",stage:"能力已具但需要驯化",focus:"蓄力、学习与节制",action:"建立训练和资源储备，再选择突破点",risk:"压抑过久或未经准备突然释放",timing:"宜先蓄后发，成熟时可承担大事" },
  { number:27,name:"頤",judgement:"观察你如何输入、表达与养育，答案藏在日常供养中。",image:"山下有雷，如口颐开合以求养。",stage:"能量来源需要整理",focus:"饮食、语言与自我供养",action:"减少有害输入，建立稳定的身心补给",risk:"只向外索取，或言语失去节制",timing:"从今天的日常开始，持续比强度重要" },
  { number:28,name:"大過",judgement:"承载已经超过常态，需要非常手段和结构减压。",image:"泽淹过木，栋梁承受重压。",stage:"责任或风险处于临界点",focus:"非常担当、减压与转向",action:"识别最脆弱的承重点并立即分担",risk:"维持表面正常直到结构断裂",timing:"不能久拖，宜快速处理关键承重点" },
  { number:29,name:"坎",judgement:"险境反复出现时，以熟练、诚信和小步穿越。",image:"水流洊至，重重险陷而不失其性。",stage:"风险重复、路径受限",focus:"习险、可信与连续行动",action:"建立安全流程，一次只处理眼前一险",risk:"因恐惧停摆或因逞强轻视风险",timing:"宜稳中求进，反复练习直至穿越" },
  { number:30,name:"離",judgement:"清晰需要依附于真实载体，光明也要持续有源。",image:"两火相续，以依附而明。",stage:"需要辨明并建立可持续支持",focus:"明辨、依附与持续照见",action:"确认判断依据，并让信息公开可核验",risk:"被表面光亮吸引或过度消耗自己",timing:"宜持续校准，清楚之后再扩大影响" },
  { number:31,name:"咸",judgement:"感应来自双方真实回应，不靠单方面推动。",image:"山上有泽，虚受而相感。",stage:"吸引与影响正在发生",focus:"感受、回应与边界",action:"表达真实感受，同时观察对方的具体回应",risk:"把一时心动解释成长期承诺",timing:"宜自然靠近，不宜操控结果" },
  { number:32,name:"恒",judgement:"长期结果来自可持续的原则，而非僵化不变。",image:"雷风相与，运动中保持常道。",stage:"关系或行动进入长期检验",focus:"持续、更新与承诺",action:"选择能长期做到的节奏并定期调整方法",risk:"把坚持变成拒绝变化",timing:"重在长期，短期波动不必频繁改向" },
  { number:33,name:"遯",judgement:"主动退让是保存力量和边界，不是失败。",image:"天下有山，强势将进而宜远避。",stage:"外部条件不利于正面推进",focus:"退避、边界与蓄势",action:"退出无效消耗，转入准备和观察",risk:"因面子恋战或退得毫无原则",timing:"宜及时退守，等待力量对比改变" },
  { number:34,name:"大壯",judgement:"力量增长时，正当使用比展示强大更重要。",image:"雷在天上，阳气盛壮而欲动。",stage:"能力与影响快速上升",focus:"实力、正当与克制",action:"把力量用于解决最重要的问题",risk:"以强压人、越界或急于证明",timing:"可以推进，但不可超过规则和关系承载力" },
  { number:35,name:"晉",judgement:"向光明前进，也要让贡献被清楚看见。",image:"火出地上，光明逐渐上升。",stage:"成长与被看见的窗口打开",focus:"进展、呈现与支持",action:"主动展示可验证成果并争取资源",risk:"只追求曝光，忽略实际能力",timing:"上升窗口已开，宜稳步增加可见成果" },
  { number:36,name:"明夷",judgement:"环境不容光明时，保护判断与核心价值。",image:"光入地中，明被遮蔽而未消失。",stage:"才智或真实暂不宜完全显露",focus:"韬晦、保护与内在清明",action:"减少无谓暴露，保存证据和关键关系",risk:"为了安全彻底放弃原则",timing:"宜内明外柔，等环境改善再公开推进" },
  { number:37,name:"家人",judgement:"先正内部角色和日常秩序，外部结果才会稳定。",image:"风自火出，影响由内而外。",stage:"内部规则塑造长期结果",focus:"角色、边界与言行一致",action:"明确每个人的责任、权利和沟通方式",risk:"要求别人守序，自己却例外",timing:"从日常小事整顿，持续后外部自然改善" },
  { number:38,name:"睽",judgement:"差异不必强行抹平，小处求同即可继续合作。",image:"火泽相背，各有方向而仍可相见。",stage:"观点分离但关系未必破裂",focus:"差异、辨别与有限合作",action:"承认分歧，先寻找一个可共同完成的小目标",risk:"把不同意见上升为人格否定",timing:"大事不宜强合，小事可先验证合作" },
  { number:39,name:"蹇",judgement:"遇阻应回身检查路径，并借助可靠支持。",image:"水在山上，前路险阻而难行。",stage:"当前路径出现实质障碍",focus:"止步、反省与求援",action:"暂停硬推，换角度并寻找有经验的帮助",risk:"把坚持等同于重复撞墙",timing:"宜先停后转，障碍未解前不扩大投入" },
  { number:40,name:"解",judgement:"压力开始松动，先解除主要束缚并处理善后。",image:"雷雨作而郁结得解。",stage:"危机过后、空间重新打开",focus:"释放、宽解与归位",action:"优先解除最大的限制，再恢复正常节奏",risk:"刚脱困就制造新的负担",timing:"宜迅速处理遗留问题，随后回归简明" },
  { number:41,name:"損",judgement:"有意识地减少非核心，才能把资源送到真正重要处。",image:"山下有泽，取下益上而求平衡。",stage:"资源需要重新分配",focus:"减损、诚意与聚焦",action:"删去一项低价值消耗，集中支持核心",risk:"只让弱势一方承担损失",timing:"短期做减法，长期观察结构是否更健康" },
  { number:42,name:"益",judgement:"增长应流向真正需要之处，并转化为共同受益。",image:"风雷相助，行动与渗透彼此增益。",stage:"资源增加、适合扩大正向影响",focus:"增益、利他与行动",action:"把新增资源投入最能产生复利的地方",risk:"只追数量，不检查增长质量",timing:"当下有利，见善即迁、有过即改" },
  { number:43,name:"夬",judgement:"该决断时要公开、清楚，但不可用暴烈替代正当。",image:"泽上于天，积聚已满而必须决开。",stage:"问题到达必须表态的临界点",focus:"决断、公开与防反弹",action:"说明事实、边界和后果，完成必要切割",risk:"情绪化宣战或低估后续反作用",timing:"宜及时决断，并为执行与善后留余地" },
  { number:44,name:"姤",judgement:"突然而来的相遇影响很大，先辨别再接纳。",image:"天下有风，一阴骤遇群阳。",stage:"意外机会或变量突然进入",focus:"相遇、辨识与防微",action:"设置观察期，确认其长期影响再承诺",risk:"被新鲜感吸引而交出关键控制",timing:"先短期接触，不宜立刻绑定" },
  { number:45,name:"萃",judgement:"聚集需要共同中心、可信仪式与现实组织。",image:"泽在地上，众流汇聚成群。",stage:"人心与资源正在汇合",focus:"聚合、共同体与秩序",action:"明确共同目标、主持者和参与规则",risk:"只聚人气，没有共同责任",timing:"宜借势集结，同时建立长期结构" },
  { number:46,name:"升",judgement:"真正的上升来自扎根、积累与获得支持。",image:"木生地中，顺势而上。",stage:"稳步成长、空间逐渐打开",focus:"积累、谦进与支持",action:"沿正确路径持续升级能力和责任",risk:"急于跳级，根基跟不上位置",timing:"宜循序上升，主动接近能提供指导的人" },
  { number:47,name:"困",judgement:"外部资源受限时，以内在诚意和核心能力守住自己。",image:"泽中无水，表面枯竭而需守志。",stage:"资源、表达或认可受困",focus:"守志、节能与真实",action:"停止无效解释，把力量集中于可控之事",risk:"因不被理解而自乱阵脚",timing:"短期宜守，困境中先恢复基本能量" },
  { number:48,name:"井",judgement:"价值在于长期可用的基础设施，而非一时得失。",image:"木上有水，汲取共同的生命来源。",stage:"系统基础需要维护或更新",focus:"公共资源、维护与可持续",action:"修好能被反复使用的流程、能力或关系",risk:"设施已成却在最后一步失效",timing:"宜长期建设，尤其重视最后的交付环节" },
  { number:49,name:"革",judgement:"变革要有充分理由、正确时机和新的制度承接。",image:"泽中有火，两种力量相冲而生变。",stage:"旧秩序已难继续",focus:"变革、时机与取信",action:"说明为何必须变，并准备替代方案",risk:"只破不立，或用变革满足个人冲动",timing:"条件成熟再公开行动，事后用结果取信" },
  { number:50,name:"鼎",judgement:"把资源转化为新的价值体系，并让合适的人各居其位。",image:"木上有火，如鼎烹饪而成新物。",stage:"转型进入制度化和养成期",focus:"鼎新、转化与用人",action:"建立新流程，让原料、角色和标准重新组合",risk:"器具不稳或责任错位",timing:"适合建设新制度，先稳住承载结构" },
  { number:51,name:"震",judgement:"突发震动先使人警醒，镇定后才能恢复秩序。",image:"洊雷相继，惊而后能守常。",stage:"意外事件打破惯性",focus:"警醒、应急与复原",action:"先稳定自己，再按预案处理最紧急事项",risk:"被惊吓驱动做出过度反应",timing:"第一时间求稳，震动过去后立即复盘" },
  { number:52,name:"艮",judgement:"该停止时停止，让注意力回到当下的位置。",image:"兼山相止，各止其所。",stage:"行动需要暂停和重新定位",focus:"止定、边界与专注",action:"停止继续消耗，明确此刻不做什么",risk:"身体停了，念头仍在追逐",timing:"宜静止一段，心与位都安定后再动" },
  { number:53,name:"漸",judgement:"关系与成长要按次序展开，稳定胜过快速。",image:"山上有木，根基稳而枝叶渐长。",stage:"长期进展正在缓慢形成",focus:"次序、耐心与正位",action:"确认当前阶段，只完成这一阶段该做的事",risk:"跳过必要过程，追求迅速确定",timing:"宜渐进，不以短期快慢判断长期价值" },
  { number:54,name:"歸妹",judgement:"关系或安排尚未处于理想位置，承诺前先看清主次。",image:"泽上有雷，情动而名分未正。",stage:"吸引先于结构成熟",focus:"位置、承诺与现实条件",action:"澄清双方角色、期待和无法交换的底线",risk:"因急于确定而接受不对等位置",timing:"不宜仓促定局，先观察结构能否调整" },
  { number:55,name:"豐",judgement:"丰盛与曝光达到高点时，更要迅速处理复杂信息。",image:"雷电皆至，声势与光明俱盛。",stage:"成果、事务与注意力同时达到高峰",focus:"丰盛、决断与盛中防衰",action:"抓住最重要的窗口，同时精简次要事务",risk:"被繁盛迷惑，忽略高峰后的变化",timing:"时机短而明，宜当下完成关键动作" },
  { number:56,name:"旅",judgement:"身处暂时环境，要守礼、轻装并保护信誉。",image:"山上有火，明亮却不能久居一处。",stage:"过渡、异地或归属未定",focus:"适应、分寸与临时性",action:"尊重当地规则，只携带必要资源前行",risk:"把临时关系当永久依靠，或言行失度",timing:"适合探索，不宜过早做不可逆绑定" },
  { number:57,name:"巽",judgement:"柔和而持续地进入，比一次强攻更能改变结构。",image:"随风相继，无孔不入而不骤迫。",stage:"影响需要逐步渗透",focus:"渐入、重复与明确命令",action:"用一致的小信号持续推动，并反复确认",risk:"过度犹豫、意见反复而失去主线",timing:"宜连续推进，效果在累积后显现" },
  { number:58,name:"兌",judgement:"喜悦和沟通能连接人，但必须建立在真诚上。",image:"两泽相连，彼此滋润而相悦。",stage:"交流、协商与情感流动增强",focus:"表达、共鸣与相互学习",action:"开展一次坦诚且能听见彼此的对话",risk:"用讨好或轻率承诺换取气氛",timing:"适合沟通协商，重要承诺仍需落到事实" },
  { number:59,name:"渙",judgement:"先化解隔阂和僵结，再以共同中心重新聚拢。",image:"风行水上，冰结消散而水流复通。",stage:"旧边界正在松开",focus:"涣散、释结与重聚",action:"解除一个阻断信息或信任的障碍",risk:"只求散开，没有新的共同中心",timing:"宜先疏通，再尽快建立新的连接方式" },
  { number:60,name:"節",judgement:"适度的限制保护长期自由，过度则伤害活力。",image:"泽上有水，以堤岸形成容量。",stage:"资源和行为需要设界",focus:"节制、规则与适度",action:"为时间、金钱或情绪设一个清楚上限",risk:"规则太苦、太密而无法持续",timing:"立即设界，并在一个周期后检查是否合度" },
  { number:61,name:"中孚",judgement:"真实可信能穿透防御，但信任必须由一致行动证明。",image:"泽上有风，内心虚明而相感。",stage:"关系进入信任检验",focus:"诚信、共感与证据",action:"说出真实意图，并用一次兑现建立信用",risk:"只有感动和表态，没有持续行动",timing:"宜坦诚沟通，以后续履约确认结果" },
  { number:62,name:"小過",judgement:"非常时期宜处理小事、保持谦下，不宜追求大跨越。",image:"山上有雷，声音越界而形势有限。",stage:"局面允许小幅调整而非大举行动",focus:"小过、谨慎与落地",action:"把目标缩小到一个安全且具体的修正",risk:"高估承载力，追求轰动性突破",timing:"小事可为，大事宜缓；宁可稍低不可过高" },
  { number:63,name:"既濟",judgement:"事情看似完成，真正的考验是维持秩序并防止反转。",image:"水火各得其位，平衡已成而仍会变化。",stage:"目标初成、进入维护期",focus:"完成、维护与防微",action:"检查薄弱环节，建立交付后的维护机制",risk:"因已经成功而放松警惕",timing:"开始顺利，越接近结束越需谨慎" },
  { number:64,name:"未濟",judgement:"尚未完成并非失败，最后阶段更需要次序与耐心。",image:"火在水上，各居其向而尚未相济。",stage:"接近完成但关键条件未合",focus:"未成、辨位与慎终",action:"找出最后一个未闭合的条件，按次序完成",risk:"在终点前急躁，令已有成果失序",timing:"可继续推进，最后一步必须慢而准确" },
];

const profileByNumber = new Map(profiles.map((profile) => [profile.number, profile]));

const categoryFrames: Record<ReadingCategory, { lens: string; action: string; evidence: string; avoid: string }> = {
  事业:{ lens:"角色、资源、交付与长期能力", action:"把启示落到一次明确交付或协作对齐", evidence:"责任更清楚，反馈或资源开始真实流动", avoid:"只谈愿景，不谈责任、期限与验收" },
  关系:{ lens:"真实需求、边界与双向回应", action:"用不指责的方式完成一次具体沟通", evidence:"对方给出具体、稳定且可持续的回应", avoid:"用猜测代替确认，或用沉默测试对方" },
  选择:{ lens:"可逆性、机会成本与现实约束", action:"用一个低成本实验换取新证据", evidence:"某个选项以更小代价带来更多真实信息", avoid:"只比较想象中的最好结果" },
  成长:{ lens:"能量分配、习惯回路与长期复利", action:"选择一个每天十五分钟、连续七天的练习", evidence:"第七天变得更清楚、更轻松或更有掌控感", avoid:"一次改变太多，让意志力承担全部压力" },
};

const lineStages = [
  { role:"起点", meaning:"事情刚萌芽，力量应先潜藏、辨认条件", action:"先完成准备，不急于证明结果" },
  { role:"显现", meaning:"问题开始进入关系与现实场域，适合寻求回应", action:"找可信的人或真实场景进行一次验证" },
  { role:"转折", meaning:"从内向外的门槛压力最大，需警惕用力过度", action:"复核风险、边界和承载力后再越过门槛" },
  { role:"进入", meaning:"已经进入外部局面，进退仍可调整", action:"保留回撤空间，用小规模行动测试后势" },
  { role:"主位", meaning:"影响力与责任达到核心位置，最适合承担和整合", action:"公开标准、承担责任，并照顾整体利益" },
  { role:"穷极", meaning:"当前趋势走到尽头，重点从扩张转为收束和转化", action:"停止加码，复盘所得并为下一周期留余地" },
];

function categoryOf(category: string): ReadingCategory {
  return category === "事业" || category === "关系" || category === "成长" ? category : "选择";
}

function inferHorizon(question: string, context?: ReadingSituationContext) {
  if (context?.horizon && context.horizon !== "不设期限") return `未来${context.horizon}`;
  const match = question.match(/(?:未来|接下来)?\s*([一二三四五六七八九十\d]+(?:个)?月|半年|一年)/);
  return match ? `未来${match[1]}` : "接下来七天";
}

function adaptQuestion(question: string, category: ReadingCategory, knowledge: HexagramKnowledge, context?: ReadingSituationContext) {
  const horizon = inferHorizon(question, context);
  const focus = `${question}${context?.focus ?? ""}`;
  if (category === "关系" && /边界|界限|底线|分寸/.test(focus)) return {
    intent:"改善关系边界", horizon,
    directAnswer:"先把边界从模糊感受变成双方都能听懂、能够重复执行的具体约定，再观察对方是否持续尊重。",
    translation:"这不是让你压住真实感受，而是先保护必须被尊重的需求，再选择对方能够接住的表达方式。",
    actions:["写下 1 条必须被尊重的边界，以及越界时你会采取的行动", "用“事实—感受—请求”完成一次不指责的沟通，并请对方复述理解", `${horizon}记录 3 次真实互动，只依据对方是否持续尊重约定来调整距离`],
    evidence:"对方能准确理解你的请求，并在后续互动中稳定调整行为", avoid:"一次说尽所有委屈、用冷淡测试对方，或把控制对方误当成建立边界",
  };
  if (category === "关系" && /修复|挽回|和好|信任/.test(focus)) return {
    intent:"修复关系与信任", horizon,
    directAnswer:"先修复一个可验证的小承诺，不急着要求关系立刻恢复；信任要由连续一致的行为重新积累。",
    translation:"落到关系修复中，重点是保护真实需要、减少猜测，并用可兑现的小行动判断双方是否仍愿意靠近。",
    actions:["各自说清最希望停止的一种伤害性互动", "共同约定一件七天内能够兑现的小事", `${horizon}只观察承诺是否持续兑现，不用一次情绪好转代替关系改善`],
    evidence:"双方都能承认影响、提出具体修正并持续兑现", avoid:"只追求一句保证，回避造成失信的具体行为",
  };
  if (category === "关系") return {
    intent:"改善关系互动", horizon,
    directAnswer:"先确认真实需求和双方愿意投入的行动，再决定靠近、调整还是拉开距离。",
    translation:"放到关系中，意味着少猜测对方的内心，多观察沟通后的具体回应与长期一致性。",
    actions:["把最困扰你的互动写成一个具体事实，而不是性格评价", "提出一个清楚、可回答的请求，并给对方表达空间", `${horizon}观察双方是否都在采取对等行动`],
    evidence:"沟通后出现具体、稳定且双向的回应", avoid:"用沉默、试探或单方面付出来换取确定感",
  };
  if (category === "事业" && /财|收入|现金流|副业|薪资|资源/.test(focus)) return {
    intent:"改善资源与现金流", horizon,
    directAnswer:"先找出最可控的一项收入来源或支出漏洞，用小规模验证代替对收益的想象。",
    translation:"放到资源问题里，指向现金流、兑现条件和风险边界，而不是抽象的“财运好坏”。",
    actions:["列出未来 30 天确定收入、必要支出与可削减支出", "选一个成本可控的增收方案，设定投入上限和验证指标", `${horizon}按实际净收益复盘，未达指标就停止追加投入`],
    evidence:"现金流变得可预测，投入能够形成真实回款或可复用资源", avoid:"只看潜在收益，不设成本上限和退出条件",
  };
  if (category === "事业" && /换工作|离职|转岗|求职|职业变化|转型/.test(focus)) return {
    intent:"评估职业变化", horizon,
    directAnswer:"不要先用去留回答焦虑；先验证新方向的岗位需求、能力差距和现实承受力。",
    translation:"放到职业变化中，是要求你把判断落到职责、资源、反馈和可持续投入上。",
    actions:["写清下一份工作的 3 个不可妥协条件", "完成 3 次真实岗位访谈或投递，用反馈验证市场需求", `${horizon}比较新机会与现状的真实证据，再决定是否离开`],
    evidence:"目标岗位、能力差距和转换成本都得到外部事实验证", avoid:"因为一次挫折冲动离开，或因害怕变化无限拖延",
  };
  if (category === "事业") return {
    intent:"推进事业问题", horizon,
    directAnswer:"把问题从“结果会不会发生”改成“哪项责任、资源或能力最需要先被验证”。",
    translation:"放到事业中，意味着优先处理影响交付和协作的真实条件。",
    actions:[knowledge.action, "完成一次明确的交付、反馈收集或协作对齐", `${horizon}用责任是否更清楚、资源是否真实流动来复盘`],
    evidence:"责任更清楚，反馈、资源或机会开始真实流动", avoid:"只谈愿景，不谈责任、期限与验收",
  };
  if (category === "成长") return {
    intent:"改善个人状态", horizon,
    directAnswer:"先把抽象的自我评价改成一个可以连续练习、能够观察变化的小行为。",
    translation:"放到成长问题中，意味着调整能量分配和重复模式，而不是给自己贴固定标签。",
    actions:["选出当前最消耗精力的一种重复行为", "设置一个每天十五分钟、连续七天的替代练习", `${horizon}用完成率和真实感受复盘，而不是用情绪评价自己`],
    evidence:"行动更稳定，内耗减少，并出现可重复的正向反馈", avoid:"一次改变太多，让意志力承担全部压力",
  };
  if (/学习|考试|升学|学业|复习/.test(focus)) return {
    intent:"调整学习与学业", horizon,
    directAnswer:"先找出学习结果不稳定的具体环节，再用一轮短测验证方法，而不是继续堆时长。",
    translation:"放到学业中，指向方法、节奏、反馈和现实能力差距。",
    actions:["用一次小测定位最薄弱的知识环节", "为该环节安排连续七天的固定练习", `${horizon}按正确率、速度和稳定性决定是否调整方法`],
    evidence:"同类任务的正确率或完成稳定性持续提升", avoid:"只增加学习时间，不检查方法与反馈",
  };
  return {
    intent:"整理选择与方向", horizon,
    directAnswer:"先明确不可妥协条件和可逆性，再用一个低成本行动补充事实。",
    translation:"放到选择中，提示你比较现实约束、机会成本和验证窗口。",
    actions:["写下每个选项的不可逆成本与退出条件", "选择一个七天内可完成的低成本实验", `${horizon}只根据新增事实更新判断，不被最理想的想象牵引`],
    evidence:"某个选项以更小代价带来更多真实信息", avoid:"只比较想象中的最好结果",
  };
}

export function getHexagramKnowledge(hexagram: Hexagram): HexagramKnowledge {
  return profileByNumber.get(hexagram.number) ?? profiles[0];
}

export function getMutualHexagram(lines: LineValue[]): Hexagram {
  if (lines.length !== 6) return getHexagram(lines);
  return getHexagram([lines[1], lines[2], lines[3], lines[2], lines[3], lines[4]]);
}

function selectedLineIndexes(lines: LineValue[]) {
  const moving = lines.flatMap((line, index) => line === 6 || line === 9 ? [index] : []);
  if (moving.length <= 3) return moving;
  const still = lines.flatMap((line, index) => line === 7 || line === 8 ? [index] : []);
  return still;
}

export function buildLineReadings(lines: LineValue[], hexagram: Hexagram): LineReading[] {
  const knowledge = getHexagramKnowledge(hexagram);
  const selected = new Set(selectedLineIndexes(lines));
  const names = ["初", "二", "三", "四", "五", "上"];
  return lines.map((value, index) => {
    const moving = value === 6 || value === 9;
    const yang = value === 7 || value === 9;
    const polarity = yang ? "九" : "六";
    const label = index === 0 ? `初${polarity}` : index === 5 ? `上${polarity}` : `${polarity}${names[index]}`;
    const stage = lineStages[index];
    const correctPlace = yang === (index % 2 === 0);
    const position = correctPlace ? "爻性与位置相应，做法较容易名实相符" : "爻性与位置不完全相应，更需要校准角色与方法";
    const change = moving ? `此爻发动，意味着“${stage.role}”正在由${yang ? "主动、外放" : "承接、内收"}转向另一面` : `此爻不动，代表“${stage.role}”仍是当前结构中的稳定条件`;
    return {
      index,
      label,
      value,
      moving,
      selected:selected.has(index),
      role:stage.role,
      modern:`「${hexagram.name}」关注${knowledge.focus}。来到${stage.role}，${stage.meaning}；${position}。${change}。`,
      action:`${stage.action}，同时围绕“${knowledge.action}”留下一个可观察的事实。`,
    };
  });
}

export function lineSelectionRule(lines: LineValue[], transformed: Hexagram) {
  const moving = lines.flatMap((line, index) => line === 6 || line === 9 ? [index] : []);
  const labels = buildLineReadings(lines, getHexagram(lines)).map((line) => line.label);
  if (moving.length === 0) return "六爻皆静：以本卦卦义和卦象为主，互卦只用来观察内在机制。";
  if (moving.length === 1) return `一爻动：以${labels[moving[0]]}为主线，本卦说明处境，之卦说明变化方向。`;
  if (moving.length === 2) return `两爻动：合看${labels[moving[0]]}与${labels[moving[1]]}，以下位爻说明起因、上位爻说明后势。`;
  if (moving.length === 3) return `三爻动：本卦与之卦等重；本卦看“为何至此”，「${transformed.name}」看“将往何处”。`;
  const still = lines.flatMap((line, index) => line === 7 || line === 8 ? [labels[index]] : []);
  if (moving.length === 4) return `四爻动：变化已成主势，以之卦为主，并看两条静爻${still.join("、")}仍在守住什么。`;
  if (moving.length === 5) return `五爻动：以之卦为主，唯一静爻${still[0]}是变化中应保留的锚点。`;
  return `六爻皆动：旧结构整体翻转，以之卦「${transformed.name}」为主；本卦用于理解变化来源。`;
}

export function buildStructuredReading(lines: LineValue[], question: string, category: string, situationContext?: ReadingSituationContext): StructuredOracleReading {
  const hexagram = getHexagram(lines);
  const transformed = getHexagram(changedLines(lines));
  const mutual = getMutualHexagram(lines);
  const knowledge = getHexagramKnowledge(hexagram);
  const transformedKnowledge = getHexagramKnowledge(transformed);
  const selectedCategory = categoryOf(category);
  const lineReadings = buildLineReadings(lines, hexagram);
  const selectedLines = lineReadings.filter((line) => line.selected);
  const movingCount = lineReadings.filter((line) => line.moving).length;
  const subject = question.trim().replace(/[。？！?!.]+$/g, "");
  const shortSubject = subject.length > 30 ? `${subject.slice(0, 30)}…` : subject;
  const questionFit = adaptQuestion(subject, selectedCategory, knowledge, situationContext);
  const contextLine = situationContext ? `你补充的处境是“${situationContext.situation}”，关注“${situationContext.focus}”，观察周期为${situationContext.horizon}。` : "";
  const relation = movingCount
    ? `本卦「${hexagram.name}」描述当下，互卦「${mutual.name}」揭示内部如何运作，之卦「${transformed.name}」提示变化后更接近“${transformedKnowledge.focus}”的局面。`
    : `本卦「${hexagram.name}」是当前主势；互卦「${mutual.name}」补充其内部动力。没有动爻，不把之卦当作未来预测。`;
  const primaryLine = selectedLines[0];
  return {
    verdict:`${questionFit.intent}：${questionFit.directAnswer}`,
    insight:`对于“${shortSubject}”，先给现实答案：${questionFit.directAnswer}${contextLine}「${hexagram.name}」所强调的${knowledge.focus}，在这个问题里可以理解为：${questionFit.translation}${primaryLine ? ` 当前取用${primaryLine.label}，表示变化首先发生在“${primaryLine.role}”这一层，需要${primaryLine.action}` : " 六爻皆静，先观察关系或现实条件是否真的发生变化。"}${relation}`,
    actions:questionFit.actions,
    avoid:`${questionFit.avoid}；同时避免${knowledge.risk}。`,
    timing:`${questionFit.horizon}作为观察窗口：重点看${questionFit.evidence}。${knowledge.timing}。`,
    mutual,
    transformed,
    lineReadings,
    selectedLines,
    selectionRule:lineSelectionRule(lines, transformed),
    relation,
    knowledge,
    questionFit:{ intent:questionFit.intent, horizon:questionFit.horizon, directAnswer:questionFit.directAnswer, translation:questionFit.translation },
  };
}

export function knowledgeStats() {
  return { hexagrams:profiles.length, lineCombinations:profiles.length * lineStages.length, categories:Object.keys(categoryFrames).length };
}
