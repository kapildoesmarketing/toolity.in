/* Designed by Kapil Pidhwani: games built after the original batch. Each entry drives gen_game_pages.js (page) and
 * games/<slug>/<slug>.js (behaviour via window.ToolityGame.mount). Keys: slug, name, icon, section, desc, lead, cardDesc, tags,
 * modes [[value,label]], modesLabel, scoreHtml, stageHtml, hint, settings, settingsSummary, guide[3], reference[[a,k,m]], faq, css, wide, copy, playLabel, idle. */
const PRIVACY_FAQ = ['Is anything uploaded or tracked while I play?', 'No. The game runs entirely in your browser tab. Your best times are saved only in your browser’s <code>localStorage</code> and cleared when you press Reset.'];
module.exports = [
  {
    slug: 'nonogram', name: 'Nonogram', icon: 'lucide:grid-2x2-check', section: 'Puzzle & Board', css: true, wide: true, playLabel: 'New puzzle', idle: 'Fill cells to match the clues', copy: 'Copy puzzle as text',
    desc: 'Free online Nonogram (Picross / griddler): freshly generated 5×5 to 20×15 picture-logic puzzles that are always solvable without guessing, plus a mode that turns any image into a puzzle. Fill, cross, undo, timer, best times, printable. Runs in your browser.',
    lead: 'Picture-logic puzzles generated on the spot and verified solvable by pure logic — fill, cross out, beat your time, or turn a photo into a puzzle.',
    cardDesc: 'Picross-style picture logic, 5×5 to 20×15, always logic-solvable; make puzzles from images.',
    tags: ['nonogram', 'picross', 'griddler', 'hanjie', 'picture logic puzzle', 'nonogram online', 'nonogram generator', 'image to nonogram', 'logic puzzle', 'paint by numbers'],
    modes: [['5', '5×5'], ['10', '10×10'], ['15', '15×15'], ['20', '20×15']], modesLabel: 'Size', defaultModeIndex: 1,
    scoreHtml: '<span>left <b id="left-val">0</b></span><i>·</i><span>time <b id="time-val">0:00</b></span><i>·</i><span>best <b id="best-val">—</b></span>',
    stageHtml: `
                  <div class="ng-wrap" id="ng-wrap">
                    <div class="ng-corner" id="ng-corner"></div>
                    <div class="ng-cols" id="ng-cols" aria-hidden="true"></div>
                    <div class="ng-rows" id="ng-rows" aria-hidden="true"></div>
                    <div class="ng-board" id="board" role="grid" aria-label="Nonogram board"></div>
                  </div>
                  <div class="game-bar" id="ng-bar" role="group" aria-label="Tools">
                    <button type="button" class="game-key is-on" id="btn-fill" aria-pressed="true" title="Fill mode (F)">■ Fill</button>
                    <button type="button" class="game-key" id="btn-cross" aria-pressed="false" title="Cross mode (X)">✕ Cross</button>
                    <button type="button" class="game-key" id="btn-check" title="Check for mistakes (C)">Check</button>
                    <button type="button" class="game-key" id="btn-image" title="Make a puzzle from an image">From image</button>
                    <button type="button" class="game-key" id="btn-print" title="Print the empty puzzle">Print</button>
                    <input type="file" id="ng-file" accept="image/*" hidden>
                  </div>`,
    hint: 'Click / tap to fill · right-click or X mode to cross · drag to paint a line · arrows + Space / X on keyboard · Z to undo',
    settingsSummary: 'Medium density · auto-cross finished lines',
    settings: `
              <div class="control-item">
                <label for="opt-density">Picture density</label>
                <select id="opt-density" class="select-clean"><option value="0.35">Sparse (easier)</option><option value="0.45" selected>Medium</option><option value="0.55">Dense (harder)</option></select>
              </div>
              <div class="control-item"><input type="checkbox" id="opt-autocross" checked><label for="opt-autocross">Cross out the rest of a line when its clues are complete</label></div>
              <div class="control-item"><input type="checkbox" id="opt-mistakes"><label for="opt-mistakes">Show mistakes immediately</label></div>
              <div class="control-item"><input type="checkbox" id="opt-sound" checked><label for="opt-sound">Sound effects</label></div>`,
    guide: [['Read the clues', 'Numbers beside a row or above a column list the runs of filled cells in order, with at least one empty cell between runs. <code>3 1</code> means three filled, a gap, then one filled.'], ['Fill and cross', 'Click to fill, right-click (or switch to <strong>Cross</strong>) to mark cells you know are empty. Drag to paint a whole run. Satisfied clues grey out automatically.'], ['Finish the picture', 'When every row and column matches its clues the picture is revealed and your time is saved. Try <strong>From image</strong> to turn any photo or logo into a puzzle for friends.']],
    reference: [['Fill a cell', '<code>Space</code> / <code>Enter</code>', 'Tap or click'], ['Cross a cell', '<code>X</code>', 'Right-click, or Cross mode + tap'], ['Move', '<code>←</code> <code>→</code> <code>↑</code> <code>↓</code>', 'Tap any cell'], ['Paint a run', 'Hold <code>Shift</code> + arrows', 'Press and drag'], ['Switch mode', '<code>F</code> / <code>X</code>', 'Tap Fill / Cross'], ['Check', '<code>C</code>', 'Tap Check'], ['Undo', '<code>Z</code>', 'Tap Undo']],
    faq: [['Are the puzzles solvable without guessing?', 'Yes. Every generated puzzle is run through a line-by-line logic solver before you see it; if the solver needs to guess, the puzzle is discarded and a new one is drawn. Image-based puzzles are checked the same way and the picture is nudged until it is logic-solvable.'], ['What do the numbers mean?', 'Each number is a run of consecutive filled cells in that row or column, in order from left to right or top to bottom, separated by at least one empty cell. A clue of 0 means the whole line is empty.'], ['How does “From image” work?', 'The picture is scaled to the grid size and converted to black and white at an automatic threshold, then adjusted so the result is a valid, logic-solvable nonogram. Simple logos, icons and high-contrast photos work best.'], ['Does it work on a phone?', 'Yes. Tap to fill, use the Cross button to mark empties, and drag to paint a run. Cells are sized to fit the screen; 20×15 is comfortable in landscape.'], ['Can I print puzzles?', 'Press <strong>Print</strong> to open a clean page with the clues and an empty grid — handy for classrooms or the train.'], PRIVACY_FAQ]
  }
];
