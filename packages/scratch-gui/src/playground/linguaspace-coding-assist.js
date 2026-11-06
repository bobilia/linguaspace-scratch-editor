const symbolNames = {
    '-': 'minus',
    '.': 'dot',
    ',': 'comma',
    '(': 'open parenthesis',
    ')': 'close parenthesis',
    '[': 'open bracket',
    ']': 'close bracket',
    '{': 'open brace',
    '}': 'close brace',
    '/': 'slash',
    '\\': 'backslash',
    '*': 'asterisk',
    '+': 'plus',
    '=': 'equals',
    '?': 'question mark',
    '!': 'exclamation mark',
    ':': 'colon',
    ';': 'semicolon',
    '"': 'quotation mark',
    "'": 'apostrophe',
    ' ': 'space'
};

const blockLabels = {
    event_whenflagclicked: 'when the green flag is clicked',
    event_whenkeypressed: 'when a key is pressed',
    event_whenthisspriteclicked: 'when this sprite is clicked',
    event_whenstageclicked: 'when the stage is clicked',
    event_broadcast: 'broadcast a message',
    motion_movesteps: 'move steps',
    motion_turnright: 'turn right',
    motion_turnleft: 'turn left',
    motion_gotoxy: 'go to x and y',
    motion_glidesecstoxy: 'glide to x and y',
    motion_changexby: 'change x by',
    motion_setx: 'set x to',
    motion_changeyby: 'change y by',
    motion_sety: 'set y to',
    motion_pointindirection: 'point in direction',
    motion_pointtowards: 'point towards',
    motion_ifonedgebounce: 'if on edge, bounce',
    looks_say: 'say',
    looks_sayforsecs: 'say for seconds',
    looks_think: 'think',
    looks_thinkforsecs: 'think for seconds',
    looks_switchcostumeto: 'switch costume to',
    looks_nextcostume: 'next costume',
    looks_switchbackdropto: 'switch backdrop to',
    sound_play: 'play sound',
    sound_playuntildone: 'play sound until done',
    sound_stopallsounds: 'stop all sounds',
    control_wait: 'wait seconds',
    control_repeat: 'repeat times',
    control_forever: 'repeat forever',
    control_if: 'if then',
    control_if_else: 'if then otherwise',
    control_repeat_until: 'repeat until',
    control_stop: 'stop',
    control_create_clone_of: 'create a clone of',
    control_delete_this_clone: 'delete this clone',
    sensing_askandwait: 'ask and wait',
    sensing_touchingobject: 'is touching',
    sensing_keypressed: 'is the key pressed',
    sensing_answer: 'answer',
    sensing_timer: 'timer',
    operator_add: 'plus',
    operator_subtract: 'minus',
    operator_multiply: 'times',
    operator_divide: 'divided by',
    operator_equals: 'equals',
    operator_lt: 'less than',
    operator_gt: 'greater than',
    operator_and: 'and',
    operator_or: 'or',
    operator_not: 'not',
    operator_join: 'join text',
    operator_random: 'pick a random number',
    data_setvariableto: 'set variable to',
    data_changevariableby: 'change variable by',
    data_showvariable: 'show variable',
    data_hidevariable: 'hide variable',
    pen_clear: 'erase all',
    pen_stamp: 'stamp'
};

let vmInstance = null;
let preferences = {
    voice_assistance: false,
    voice_name: null,
    speech_rate: 1,
    speak_typed_characters: true,
    speak_selected_blocks: true
};
let speakingElement = null;
let selectedId = null;
let mutationObserver = null;

const speak = (text, element) => {
    if (!preferences.voice_assistance || !text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (speakingElement) speakingElement.classList.remove('linguaspace-speaking-block');
    speakingElement = element || null;
    if (speakingElement) speakingElement.classList.add('linguaspace-speaking-block');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = preferences.speech_rate || 1;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(voice => voice.voiceURI === preferences.voice_name) ||
        voices.find(voice => voice.lang && voice.lang.toLowerCase().startsWith('en')) || null;
    utterance.onend = utterance.onerror = () => {
        if (speakingElement) speakingElement.classList.remove('linguaspace-speaking-block');
        speakingElement = null;
    };
    window.speechSynthesis.speak(utterance);
};

const getSelectedBlock = () => {
    const selected = document.querySelector('.blocklyWorkspace .blocklySelected[data-id]') ||
        document.querySelector('.blocklyWorkspace .blocklySelected');
    if (!selected || selected.closest('.blocklyFlyout')) return null;
    return selected;
};

const getBlockText = element => {
    if (!element) return '';
    const label = Array.from(element.querySelectorAll('.blocklyText'))
        .map(node => node.textContent || '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    return label || (element.getAttribute('aria-label') || '').trim();
};

const getVmBlock = id => {
    const target = vmInstance && vmInstance.runtime.getEditingTarget();
    if (!target || !target.blocks || !id) return null;
    const block = target.blocks.getBlock(id);
    return block ? {target, block} : null;
};

const getFieldValues = block => Object.values(block.fields || {})
    .map(field => field && field.value)
    .filter(value => typeof value !== 'undefined' && value !== null && String(value).trim())
    .map(String);

const getInputValues = (target, block) => Object.values(block.inputs || {}).flatMap(input => {
    const childId = input.block || input.shadow;
    const child = childId && target.blocks.getBlock(childId);
    if (!child) return [];
    if (child.opcode === 'math_number' || child.opcode === 'text' || child.opcode === 'colour_picker') {
        return getFieldValues(child);
    }
    if ([
        'operator_add',
        'operator_subtract',
        'operator_multiply',
        'operator_divide'
    ].includes(child.opcode)) {
        return [describeBlock(target, child, 1)];
    }
    return getFieldValues(child);
});

const describeBlock = (target, block, depth) => {
    if (!block || depth > 2) return '';
    const fallbackPhrase = block.opcode
        .replace(/^(motion|looks|sound|event|control|sensing|operator|data|pen)_/, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ');
    const phrase = blockLabels[block.opcode] || fallbackPhrase;
    return [phrase, ...getInputValues(target, block), ...getFieldValues(block)].join(' ').replace(/\s+/g, ' ')
        .trim();
};

const collectScript = (target, startId, spoken, visited, depth = 0) => {
    if (depth > 10) return;
    let block = target.blocks.getBlock(startId);
    while (block && !visited.has(block.id) && spoken.length < 60) {
        visited.add(block.id);
        spoken.push(describeBlock(target, block, 0));
        for (const [inputName, input] of Object.entries(block.inputs || {})) {
            if (inputName.startsWith('SUBSTACK') && (input.block || input.shadow)) {
                collectScript(target, input.block || input.shadow, spoken, visited, depth + 1);
            }
        }
        block = target.blocks.getBlock(block.next);
    }
};

const selectedBlockDescription = () => {
    const element = getSelectedBlock();
    if (!element) return null;
    const id = element.getAttribute('data-id');
    const result = getVmBlock(id);
    const text = result ? describeBlock(result.target, result.block, 0) : getBlockText(element);
    return {element, id, text};
};

const readSelectedScript = () => {
    const selected = selectedBlockDescription();
    if (!selected || !selected.id) {
        speak('Select a block in a script first.');
        return;
    }
    const result = getVmBlock(selected.id);
    if (!result) {
        speak(selected.text, selected.element);
        return;
    }
    const {target} = result;
    const topId = target.blocks.getTopLevelScript(selected.id);
    const spoken = [];
    const visited = new Set();
    collectScript(target, topId, spoken, visited);
    speak(spoken.filter(Boolean).join('. '), selected.element);
};

const updateSelectedBlock = () => {
    const selected = selectedBlockDescription();
    if (!selected || !selected.id || selected.id === selectedId) return;
    selectedId = selected.id;
    if (preferences.voice_assistance && preferences.speak_selected_blocks) speak(selected.text, selected.element);
};

const keyName = key => symbolNames[key] || key;

const onKeyDown = event => {
    const blocked = event.ctrlKey || event.metaKey || event.altKey;
    if (!preferences.voice_assistance || !preferences.speak_typed_characters || blocked) return;
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches('.blocklyHtmlInput, .blocklyDropDownInput')) return;
    if (event.key.length === 1) speak(keyName(event.key));
};

const onMessage = async event => {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.app !== 'linguaspace-coding') return;
    if (data.type === 'preferences') {
        preferences = {...preferences, ...(data.preferences || {})};
        if (!preferences.voice_assistance && window.speechSynthesis) window.speechSynthesis.cancel();
    } else if (data.type === 'stop-speech') {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        if (speakingElement) speakingElement.classList.remove('linguaspace-speaking-block');
        speakingElement = null;
    } else if (data.type === 'read-block') {
        const selected = selectedBlockDescription();
        if (selected) speak(selected.text, selected.element);
    } else if (data.type === 'read-script') {
        readSelectedScript();
    } else if (data.type === 'export-project' && vmInstance) {
        try {
            const blob = await vmInstance.saveProjectSb3();
            const buffer = await blob.arrayBuffer();
            window.parent.postMessage(
                {app: 'linguaspace-scratch', type: 'project-exported', buffer},
                window.location.origin,
                [buffer]
            );
        } catch (error) {
            window.parent.postMessage(
                {app: 'linguaspace-scratch', type: 'export-failed', message: String(error)},
                window.location.origin
            );
        }
    } else if (data.type === 'load-project' && vmInstance && data.buffer) {
        try {
            await vmInstance.loadProject(data.buffer);
            window.parent.postMessage(
                {app: 'linguaspace-scratch', type: 'project-loaded', title: data.title || ''},
                window.location.origin
            );
        } catch (error) {
            window.parent.postMessage(
                {app: 'linguaspace-scratch', type: 'load-failed', message: String(error)},
                window.location.origin
            );
        }
    }
};

export const installLinguaSpaceCodingAssist = vm => {
    if (vmInstance) return;
    vmInstance = vm;
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('click', () => window.requestAnimationFrame(updateSelectedBlock), true);
    mutationObserver = new MutationObserver(() => window.requestAnimationFrame(updateSelectedBlock));
    mutationObserver.observe(document.body, {
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
        childList: true
    });
    window.addEventListener('message', onMessage);
    vm.runtime.on(vm.runtime.constructor.PROJECT_LOADED, () => {
        window.parent.postMessage({app: 'linguaspace-scratch', type: 'ready'}, window.location.origin);
    });
    window.addEventListener('beforeunload', () => {
        if (mutationObserver) mutationObserver.disconnect();
        document.removeEventListener('keydown', onKeyDown, true);
        window.removeEventListener('message', onMessage);
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    }, {once: true});
    const style = document.createElement('style');
    style.textContent = [
        '.blocklyBlockCanvas .linguaspace-speaking-block .blocklyPath {',
        'stroke: #ffd447 !important;',
        'stroke-width: 5px !important;',
        'filter: drop-shadow(0 0 4px rgba(255,212,71,.65));',
        '}'
    ].join(' ');
    document.head.appendChild(style);
};
