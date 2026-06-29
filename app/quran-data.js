// NIYYAH GitHub Pages data loader.
// The full Qur'an data file is stored at the repository root because GitHub's web uploader placed it there.
// This shim keeps app/index.html working without duplicating the 11MB data file.
document.write('<script src="../quran-data.js"><\/script>');
