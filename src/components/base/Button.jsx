import ScaleLoader from "react-spinners/ScaleLoader";

const Button = ({ label, onClick, isLoading, disabled }) => {
  const opacity = disabled ? 0.75 : 1;
  const cursor = disabled ? "not-allowed" : "pointer";

  const Contents = isLoading ? (
    <ScaleLoader
      color="#000"
      height={10}
      width={2.5}
      margin={0.5}
      loading={true}
      size={50}
      css={{ display: "block", margin: "0 auto" }}
    />
  ) : (
    <p style={{ margin: 0, padding: 0 }}>{label}</p>
  );

  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: "rgb(28, 87, 217)",
        color: "white",
        borderRadius: "100rem",
        padding: ".75rem 1.5rem",
        fontSize: "16px",
        outline: "none",
        boxShadow: "0px 4px 8px rgba(0,0,0,0.1)",
        transition: "all 0.3s ease",
        opacity,
        cursor,
        minWidth: "250px",
        margin: "20px"
      }}
    >
      {Contents}
    </button>
  );
};

export default Button;
